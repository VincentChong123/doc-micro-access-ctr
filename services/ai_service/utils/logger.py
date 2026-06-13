import logging
import logfire


def setup_logger(use_long_path: bool = True):
    """
    Centralized configuration for standard Python Logging and Logfire.
    """
    # 1. Configure the native Logfire behavior (Dashboard telemetry)
    logfire.configure(
        send_to_logfire="if-token-present",
        # Turn off native verbose console so standard logging can take over
        console=False,
        pydantic_plugin=logfire.PydanticPlugin(record="all"),
    )

    # Select the path format based on the variable
    path_format = "%(pathname)s" if use_long_path else "%(filename)s"

    # 2. Configure standard Python logging for the local terminal AND Logfire dashboard
    logging.basicConfig(
        level=logging.INFO,
        format=f"%(asctime)s.%(msecs)03d [{path_format}:%(lineno)d] %(funcName)s(): %(message)s",
        datefmt="%H:%M:%S",
        handlers=[
            logging.StreamHandler(),  # Prints to terminal using your custom format
            logfire.LogfireLoggingHandler(),  # Intercepts and sends to Logfire dashboard
        ],
    )


# Run it immediately when this utils file is imported
# Change use_long_path=False if you want the short filenames again!
setup_logger(use_long_path=False)
