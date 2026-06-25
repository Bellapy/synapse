from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime, timezone
from database import Base

class QueryHistory(Base):
    __tablename__ = "query_history"

    id = Column(Integer, primary_key=True, index=True)
    query = Column(String, index=True, nullable=False)
    expansion_type = Column(String, nullable=False, default="initial")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))