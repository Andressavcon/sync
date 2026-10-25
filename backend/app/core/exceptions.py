from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class AppError(Exception):
    """Base business error. Services raise these; never HTTP details directly."""

    status_code = 400

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class NotFoundError(AppError):
    status_code = 404


class ConflictError(AppError):
    status_code = 409


class InvalidDataError(AppError):
    status_code = 422


def register_exception_handlers(app: FastAPI) -> None:
    """Turns AppError into a JSON response (like @ControllerAdvice + @ExceptionHandler)."""

    @app.exception_handler(AppError)
    async def handle_app_error(_request: Request, error: AppError) -> JSONResponse:
        return JSONResponse(status_code=error.status_code, content={"detail": error.message})
