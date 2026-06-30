from typing import Optional, Any
from pydantic import BaseModel, Field, ConfigDict
from pydantic.alias_generators import to_camel

class UserSettings(BaseModel):
    working_hours_start: str = "09:00"
    working_hours_end: str = "17:00"
    deep_work_duration_minutes: int = 120
    break_duration_minutes: int = 15
    calendar_sync_interval_minutes: int = 15
    time_zone: str = "UTC"

class UserDynamicModel(BaseModel):
    """Continuously updated behavioral model of the user."""
    preferred_wake_time: str = "07:00"
    preferred_work_blocks: list[str] = ["09:00-11:00", "14:00-16:00"]
    average_focus_duration_minutes: int = 90
    average_meeting_length_minutes: int = 45
    most_productive_weekday: str = "Tuesday"
    most_productive_hour: str = "10:00"
    common_procrastination_periods: list[str] = ["15:00-16:00"]
    task_completion_rate: float = 0.85
    recovery_success_rate: float = 0.90
    deep_work_consistency: float = 0.75

class UserProfile(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    uid: str
    display_name: str
    email: str
    photo_url: Optional[str] = None
    provider: str
    calendar_connected: bool = False
    last_sync: Optional[str] = None
    settings: UserSettings = Field(default_factory=UserSettings)
    dynamic_model: UserDynamicModel = Field(default_factory=UserDynamicModel)
