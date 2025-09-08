from contextlib import AbstractContextManager
from dataclasses import dataclass, field

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

from src.core.base import Base


@dataclass
class SqliteConnector:
    db_url: str | None = field(default=None)
    _memory: str = field(default="file:memory?mode=memory&cache=shared&uri=true")

    eng: Engine = field(init=False)
    session_maker: sessionmaker[Session] = field(init=False)

    def __post_init__(self) -> None:
        if not self.db_url:
            self.db_url = self._memory

        self.eng = create_engine(f"sqlite:///{self.db_url}")
        self.session_maker = sessionmaker(bind=self.eng)

        Base.metadata.create_all(self.eng)

    def session(self) -> AbstractContextManager[Session]:
        return self.session_maker()

    def engine(self) -> Engine:
        return self.eng
