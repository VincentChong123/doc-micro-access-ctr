import logfire
logfire.configure(send_to_logfire='if-token-present', console=logfire.ConsoleOptions(verbose=True))
logfire.info("Hello world")
