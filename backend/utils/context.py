import contextvars

# Stores the authenticated user ID for the current request.
# Defaults to "default_user" for backward compatibility if not set.
current_user_id = contextvars.ContextVar("current_user_id", default="default_user")
