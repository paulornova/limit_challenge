import random
from datetime import date, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from faker import Faker

from fleet.models import MaintenanceRecord, Mechanic, Office, Vehicle


class Command(BaseCommand):
    help = "Create deterministic sample data for the fleet maintenance API."

    def add_arguments(self, parser):
        parser.add_argument("--seed", type=int, help="Seed for reproducible generated data.")
        parser.add_argument("--offices", type=int, default=5)
        parser.add_argument("--vehicles", type=int, default=100)
        parser.add_argument("--mechanics", type=int, default=20)
        parser.add_argument("--maintenance-records", type=int, default=500)
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete existing fleet data before creating the new dataset.",
        )

    def handle(self, *args, **options):
        self._validate_options(options)
        existing_data = any(
            model.objects.exists()
            for model in (Office, Vehicle, Mechanic, MaintenanceRecord)
        )
        if existing_data and not options["clear"]:
            raise CommandError("Fleet data already exists. Use --clear to replace it.")

        seed = options["seed"]
        if seed is None:
            seed = random.SystemRandom().randint(0, 2**31 - 1)
        random_generator = random.Random(seed)
        faker = Faker()
        faker.seed_instance(seed)

        with transaction.atomic():
            if options["clear"]:
                self._clear_data()
            offices = self._create_offices(options["offices"], faker)
            mechanics = self._create_mechanics(options["mechanics"], faker, seed)
            vehicles = self._create_vehicles(
                options["vehicles"], offices, random_generator, seed
            )
            maintenance_records, heavy_history_vehicles = self._create_maintenance_records(
                options["maintenance_records"],
                vehicles,
                mechanics,
                random_generator,
            )

        self.stdout.write(
            self.style.SUCCESS(
                "Created "
                f"{len(offices)} offices, {len(vehicles)} vehicles, "
                f"{len(mechanics)} mechanics, and {maintenance_records} maintenance records "
                f"(seed={seed})."
            )
        )
        if heavy_history_vehicles:
            vehicle_ids = ", ".join(str(vehicle.pk) for vehicle in heavy_history_vehicles)
            self.stdout.write(
                f"Heavy-history vehicle IDs (500 records each): {vehicle_ids}."
            )

    @staticmethod
    def _validate_options(options):
        for option in ("offices", "vehicles", "mechanics", "maintenance_records"):
            if options[option] < 0:
                raise CommandError(f"--{option.replace('_', '-')} must be non-negative.")
        if options["vehicles"] and not options["offices"]:
            raise CommandError("At least one office is required when creating vehicles.")
        if options["maintenance_records"] and not options["vehicles"]:
            raise CommandError("At least one vehicle is required when creating maintenance records.")
        if options["maintenance_records"] and not options["mechanics"]:
            raise CommandError("At least one mechanic is required when creating maintenance records.")

    @staticmethod
    def _clear_data():
        MaintenanceRecord.objects.all().delete()
        Vehicle.objects.all().delete()
        Mechanic.objects.all().delete()
        Office.objects.all().delete()

    @staticmethod
    def _create_offices(count, faker):
        offices = [
            Office(name=f"{faker.city()} Office {index + 1}", city=faker.city())
            for index in range(count)
        ]
        return Office.objects.bulk_create(offices)

    @staticmethod
    def _create_mechanics(count, faker, seed):
        mechanics = [
            Mechanic(
                name=faker.name(),
                certification_number=f"CERT-{seed:010d}-{index:05d}",
                active=index % 5 != 0,
            )
            for index in range(count)
        ]
        return Mechanic.objects.bulk_create(mechanics)

    @staticmethod
    def _create_vehicles(count, offices, random_generator, seed):
        vehicles = []
        active_plates = []
        makes_and_models = [
            ("Ford", "Transit"),
            ("Toyota", "Corolla"),
            ("Honda", "Civic"),
            ("Chevrolet", "Express"),
            ("Volkswagen", "Crafter"),
        ]
        assignable_offices = offices[:-1] if len(offices) > 1 else offices
        seed_token = seed % 1_000_000

        for index in range(count):
            active = index % 5 != 0
            if not active and active_plates:
                license_plate = active_plates[index % len(active_plates)]
            else:
                license_plate = f"PL{seed % 100000:05d}{index:05d}"

            if active:
                active_plates.append(license_plate)
            make, model = makes_and_models[index % len(makes_and_models)]
            vehicles.append(
                Vehicle(
                    vin=f"SEED{seed_token:06d}{index:07d}",
                    license_plate=license_plate,
                    make=make,
                    model=model,
                    year=random_generator.randint(2010, date.today().year),
                    office=assignable_offices[index % len(assignable_offices)],
                    active=active,
                )
            )
        return Vehicle.objects.bulk_create(vehicles, batch_size=1000)

    def _create_maintenance_records(
        self, count, vehicles, mechanics, random_generator
    ):
        if not count:
            return 0, []

        no_history_count = max(1, len(vehicles) // 10)
        eligible_vehicles = vehicles[no_history_count:]
        if not eligible_vehicles:
            eligible_vehicles = vehicles

        single_history_vehicle = eligible_vehicles[-1]
        several_history_vehicle = (
            eligible_vehicles[-2] if len(eligible_vehicles) > 1 else single_history_vehicle
        )
        heavy_history_candidates = [
            vehicle
            for vehicle in eligible_vehicles
            if vehicle not in [single_history_vehicle, several_history_vehicle]
        ]

        heavy_history_vehicles = []
        heavy_record_count = 0
        if count >= 1000 and heavy_history_candidates:
            heavy_vehicle_count = min(
                3, max(1, count // 25000), len(heavy_history_candidates)
            )
            heavy_history_vehicles = heavy_history_candidates[:heavy_vehicle_count]
            heavy_record_count = 500 * len(heavy_history_vehicles)

        random_vehicles = [
            vehicle
            for vehicle in eligible_vehicles
            if vehicle not in [single_history_vehicle, *heavy_history_vehicles]
        ]
        if not random_vehicles:
            random_vehicles = [several_history_vehicle]

        records = []
        for index in range(count):
            if index == 0:
                vehicle = single_history_vehicle
            elif index in (1, 2):
                vehicle = several_history_vehicle
            elif 3 <= index < 3 + heavy_record_count:
                vehicle = heavy_history_vehicles[(index - 3) // 500]
            else:
                vehicle = random_vehicles[random_generator.randrange(len(random_vehicles))]
            records.append(
                MaintenanceRecord(
                    vehicle=vehicle,
                    mechanic=mechanics[random_generator.randrange(len(mechanics))],
                    maintenance_date=self._maintenance_date(index, random_generator),
                    maintenance_type=random_generator.choice(
                        ["Inspection", "Oil change", "Tire service", "Brake repair", "Repair"]
                    ),
                    cost=Decimal(random_generator.randint(5000, 200000)) / Decimal("100"),
                    notes="Generated sample maintenance record.",
                )
            )
        MaintenanceRecord.objects.bulk_create(records, batch_size=1000)
        return len(records), heavy_history_vehicles

    @staticmethod
    def _maintenance_date(index, random_generator):
        if index % 10 < 5:
            days_ago = random_generator.randint(0, 364)
        elif index % 10 < 8:
            days_ago = random_generator.randint(366, 730)
        else:
            days_ago = random_generator.randint(731, 1825)
        return date.today() - timedelta(days=days_ago)
