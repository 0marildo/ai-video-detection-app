import boto3
from botocore.config import Config
from decouple import config
import uuid

R2_ACCOUNT_ID = config("R2_ACCOUNT_ID", default=None)
R2_ACCESS_KEY_ID = config("R2_ACCESS_KEY_ID", default=None)
R2_SECRET_ACCESS_KEY = config("R2_SECRET_ACCESS_KEY", default=None)
R2_BUCKET_NAME = config("R2_BUCKET_NAME", default=None)

s3 = None
if all([R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME]):
    s3 = boto3.client(
        "s3",
        endpoint_url=f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
        aws_access_key_id=R2_ACCESS_KEY_ID,
        aws_secret_access_key=R2_SECRET_ACCESS_KEY,
        config=Config(signature_version="s3v4"),
        region_name="auto"
    )

def upload_video(file_bytes: bytes, filename: str) -> str:
    if s3 is None:
        raise RuntimeError("R2 storage is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET_NAME.")

    key = f"videos/{uuid.uuid4()}-{filename}"
    
    s3.put_object(
        Bucket=R2_BUCKET_NAME,
        Key=key,
        Body=file_bytes,
        ContentType="video/mp4"
    )
    
    return key  # retorna a key, não a URL pública

def delete_video(key: str):
    if s3 is None:
        raise RuntimeError("R2 storage is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET_NAME.")

    s3.delete_object(Bucket=R2_BUCKET_NAME, Key=key)