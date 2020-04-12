# typescript-openapi-json
Generates OpenAPI JSON from named function exports in a Typescript file

# Example Usage

The following is an example of retrieving a named export of `handler` from the file `/test/handlers/handler.inline.ts` and printing the input and output types of that function.

```
$ npm run build
$ npm start -- ./test/handlers/handler.inline.ts handler
# Or you can do node ./dist/index ./test/handlers/handler.inline.ts handler
{
    "path": "test/handlers/handler.inline.ts",
    "summary": "Account Users",
    "description": "Gets of all the users in the account",
    "inputType": [
        {
            "headers": {
                "\"Authorization\"": {
                    "type": "string"
                },
                "\"x-userid\"": {
                    "type": "string"
                },
                "rando": {
                    "type": "string"
                }
            },
            "queryStringParameters": {
                "doTHeGuy": {
                    "type": "string"
                }
            },
            "pathParameters": {
                "push": {
                    "$oneOf": [
                        {
                            "type": "boolean",
                            "enum": [
                                true
                            ]
                        },
                        {
                            "type": "boolean",
                            "enum": [
                                false
                            ]
                        }
                    ]
                }
            }
        }
    ],
    "returns": {
        "$oneOf": [
            {
                "type": "object",
                "properties": {
                    "statusCode": {
                        "type": "number"
                    },
                    "body": {
                        "message": {
                            "type": "string"
                        },
                        "data": {
                            "ss": {
                                "type": "number"
                            }
                        }
                    }
                }
            },
            {
                "type": "object",
                "properties": {
                    "message": {
                        "type": "string"
                    },
                    "data": {
                        "ss": {
                            "type": "number"
                        }
                    }
                }
            }
        ]
    }
}
```