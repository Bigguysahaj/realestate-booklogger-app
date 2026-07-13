"""Seed the database with an admin user and sample records.

Usage:  python -m app.seed [email] [password] [name]
Defaults: admin@example.com / changeme123
"""

import sys
from datetime import datetime, timezone

from sqlmodel import Session, select

from .auth import hash_password
from .models import Record, User, engine, init_db

SAMPLE_RECORDS = [
    dict(property_type="Plot", address="A-14, Sainik Farms, New Delhi", area_sqyd=250,
         facing="East", construction_status="Vacant plot", title_type="GPA",
         colony_status="Unauthorized", occupancy="Vacant",
         consent=("Rakesh Sharma", "9810012345", "Yes", 32500000),
         notes="Corner plot, wide road access"),
    dict(property_type="Independent house", address="C-8, Chittaranjan Park, New Delhi",
         area_sqyd=200, floors=2, facing="North", construction_status="Ready",
         title_type="Freehold", colony_status="Authorized", occupancy="Owner-occupied",
         consent=("S. Banerjee", "9811122233", "Maybe", 65000000),
         notes="Old construction, rebuild potential"),
    dict(property_type="Builder floor", address="E-121, Greater Kailash II, New Delhi",
         area_sqyd=208, floors=1, facing="South", construction_status="Ready",
         title_type="Freehold", colony_status="Authorized", occupancy="Tenant",
         notes="2nd floor with terrace rights, tenant lease ends Dec"),
    dict(property_type="Flat", address="Tower 4, Flat 902, Sector 50, Noida",
         area_sqyd=145, floors=1, facing="NE", construction_status="Ready",
         title_type="Leasehold", colony_status="Authorized", occupancy="Owner-occupied",
         consent=("Priya Malhotra", "9899988877", "No", None),
         notes="Not interested now, revisit next year"),
    dict(property_type="Commercial", address="Shop 12, Main Market, Lajpat Nagar II",
         area_sqyd=40, floors=1, facing="West", construction_status="Ready",
         title_type="Freehold", colony_status="Authorized", occupancy="Tenant",
         consent=("Harbhajan Singh", "9871234500", "Yes", 27500000),
         notes="Running tenancy, good footfall"),
    dict(property_type="Plot", address="Khasra 88, Chattarpur Extension, New Delhi",
         area_sqyd=500, facing="NW", construction_status="Vacant plot",
         title_type="GPA", colony_status="Lal Dora", occupancy="Vacant",
         notes="Boundary wall only, verify khasra papers"),
    dict(property_type="Independent house", address="H-33, Sangam Vihar, New Delhi",
         area_sqyd=60, floors=3, facing="East", construction_status="Ready",
         title_type="GPA", colony_status="Unauthorized", occupancy="Owner-occupied",
         consent=("Mohd. Irfan", "9990011223", "Maybe", 9500000),
         notes="Three floors rented partially"),
    dict(property_type="Builder floor", address="B-56, Uttam Nagar West, New Delhi",
         area_sqyd=90, floors=1, facing="South", construction_status="Under construction",
         title_type="Freehold", colony_status="Regularised", occupancy="Vacant",
         notes="Possession in 3 months, builder open to pre-sale"),
    dict(property_type="Flat", address="DDA Flat 45-C, Munirka, New Delhi",
         area_sqyd=75, floors=1, facing="SW", construction_status="Ready",
         title_type="Leasehold", colony_status="Authorized", occupancy="Tenant",
         consent=("V. Raghavan", "9818877665", "Yes", 14000000),
         notes="Conversion to freehold in progress"),
    dict(property_type="Plot", address="Plot 220, Sector 17, Faridabad",
         area_sqyd=300, facing="North", construction_status="Vacant plot",
         title_type="Freehold", colony_status="Authorized", occupancy="Vacant",
         notes="HUDA sector, clean title"),
]


def seed(email: str, password: str, name: str) -> None:
    init_db()
    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == email)).first()
        if user is None:
            user = User(email=email, password_hash=hash_password(password), name=name)
            session.add(user)
            session.commit()
            print(f"Created user {email}")
        else:
            print(f"User {email} already exists, skipping")

        if session.exec(select(Record)).first() is not None:
            print("Records already exist, skipping sample data")
            return

        for sample in SAMPLE_RECORDS:
            sample = dict(sample)
            consent = sample.pop("consent", None)
            record = Record(created_by=email, **sample)
            if consent:
                record.owner_name, record.owner_phone, record.willing_to_sell, record.expected_price = consent
                record.consent_given = True
                record.consent_timestamp = datetime.now(timezone.utc)
            session.add(record)
        session.commit()
        print(f"Inserted {len(SAMPLE_RECORDS)} sample records")


if __name__ == "__main__":
    args = sys.argv[1:]
    seed(
        email=args[0] if len(args) > 0 else "admin@example.com",
        password=args[1] if len(args) > 1 else "changeme123",
        name=args[2] if len(args) > 2 else "Admin",
    )
