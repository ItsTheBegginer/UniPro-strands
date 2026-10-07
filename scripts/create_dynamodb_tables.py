"""
Create UniPro's DynamoDB tables. Idempotent — safe to run multiple times.

Usage:
    python scripts/create_dynamodb_tables.py
"""
import os

import boto3
from botocore.exceptions import ClientError
from dotenv import load_dotenv

load_dotenv()

REGION = os.environ.get("AWS_REGION", "us-east-1")
ddb = boto3.client("dynamodb", region_name=REGION)

TABLES = [
    {
        "TableName": os.environ.get("DDB_TABLE_APPLICATIONS", "unipro-applications"),
        "KeySchema": [{"AttributeName": "application_id", "KeyType": "HASH"}],
        "AttributeDefinitions": [{"AttributeName": "application_id", "AttributeType": "S"}],
    },
    {
        "TableName": os.environ.get("DDB_TABLE_PROFILES", "unipro-profiles"),
        "KeySchema": [{"AttributeName": "student_id", "KeyType": "HASH"}],
        "AttributeDefinitions": [{"AttributeName": "student_id", "AttributeType": "S"}],
    },
    {
        "TableName": os.environ.get("DDB_TABLE_ACTIVITY", "unipro-activity"),
        "KeySchema": [
            {"AttributeName": "application_id", "KeyType": "HASH"},
            {"AttributeName": "timestamp", "KeyType": "RANGE"},
        ],
        "AttributeDefinitions": [
            {"AttributeName": "application_id", "AttributeType": "S"},
            {"AttributeName": "timestamp", "AttributeType": "S"},
        ],
    },
]

for table in TABLES:
    try:
        ddb.create_table(BillingMode="PAY_PER_REQUEST", **table)
        print(f"Creating {table['TableName']} ...")
    except ClientError as e:
        if e.response["Error"]["Code"] == "ResourceInUseException":
            print(f"{table['TableName']} already exists, skipping.")
        else:
            raise

print("Done. Tables may take a few seconds to become ACTIVE.")
