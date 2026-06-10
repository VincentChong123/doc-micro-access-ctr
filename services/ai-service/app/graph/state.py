from pydantic import BaseModel

class UCPBaseState(BaseModel):
    """
    Placeholder for the BaseState class from your ucp.shared.contracts
    This will be used when you migrate to pydantic-graph nodes.
    """
    current_prompt: str
    intent_confirmed: bool = False
