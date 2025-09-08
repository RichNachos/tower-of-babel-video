from contextlib import AbstractContextManager
from typing import Protocol

from sqlalchemy import Engine
from sqlalchemy.orm import DeclarativeBase, MappedAsDataclass, Session


class Base(MappedAsDataclass, DeclarativeBase):
    pass


class Connector(Protocol):
    def session(self) -> AbstractContextManager[Session]: ...

    def engine(self) -> Engine: ...
