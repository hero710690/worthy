"""
Flask adapter for Worthy Lambda function on Cloud Run.
Translates HTTP requests into Lambda event format and returns the response.
"""
import json
import os
from flask import Flask, request, Response
from worthy_lambda_function import lambda_handler

app = Flask(__name__)


@app.route("/", defaults={"path": ""}, methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
@app.route("/<path:path>", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
def proxy(path):
    """Convert Flask request to Lambda event and return the response."""
    # Build the Lambda event in API Gateway proxy format
    event = {
        "httpMethod": request.method,
        "path": "/" + path if path else "/",
        "headers": dict(request.headers),
        "body": request.get_data(as_text=True) or None,
        "queryStringParameters": dict(request.args) if request.args else None,
    }

    # Call the Lambda handler
    result = lambda_handler(event, None)

    # Convert Lambda response back to Flask response
    status_code = result.get("statusCode", 500)
    headers = result.get("headers", {})
    body = result.get("body", "")

    return Response(body, status=status_code, headers=headers)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port, debug=False)
