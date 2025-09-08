import os

from src.core.base import Connector
from src.infra.sql.sqlite import SqliteConnector


def connector() -> Connector:
    return SqliteConnector(db_path=os.getenv("DB", ":memory:"))
