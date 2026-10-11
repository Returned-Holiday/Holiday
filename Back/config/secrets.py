import json
import os
from functools import lru_cache

import boto3


class MissingSecretError(RuntimeError):
    pass


@lru_cache(maxsize=1)
def _load_secret_bundle() -> dict[str, str]:
    # 운영 서버는 AWS_SECRET_ID가 있을 때 EC2 역할 권한으로 Secrets Manager에서 읽고, 로컬은 환경변수만 쓴다
    secret_id = os.environ.get("AWS_SECRET_ID")
    if not secret_id:
        return {}
    client = boto3.client("secretsmanager", region_name=os.environ.get("AWS_REGION"))
    response = client.get_secret_value(SecretId=secret_id)
    bundle = json.loads(response["SecretString"])
    if not isinstance(bundle, dict):
        raise MissingSecretError("secret bundle must be a JSON object")
    return {str(key): str(value) for key, value in bundle.items()}


def get_secret(name: str) -> str:
    value = _load_secret_bundle().get(name) or os.environ.get(name)
    if not value:
        raise MissingSecretError(f"{name} is not configured")
    return value


def get_list(name: str) -> list[str]:
    return [item.strip() for item in get_secret(name).split(",") if item.strip()]


def get_bool(name: str, default: bool = False) -> bool:
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() == "true"
