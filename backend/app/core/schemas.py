from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class ApiModel(BaseModel):
    """Base for every request/response body.

    Python uses snake_case (due_date), the JSON uses camelCase (dueDate) like the frontend.
    """

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,  # also accept snake_case names
        from_attributes=True,  # build from SQLAlchemy objects (card.title -> title)
    )
