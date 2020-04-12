# typescript-openapi-json
Generates OpenAPI JSON from named function exports in a Typescript file

# Example Usage

The following is an example of retrieving a named export of `handler` from the file `/test/handlers/handler.inline.ts` and printing the flattened input and output types of that function.

```
$ npm run build
$ npm start -- ./test/handlers/handler.inline.ts handler
# Or you can do node ./dist/index ./test/handlers/handler.inline.ts handler
{
    "path": "../test/handlers/handler.inline.ts",
    "summary": "Account Users",
    "description": "Gets of all the users in the account",
    "inputType": [
        {
            "type": "object",
            "properties": {
                "headers": {
                    "type": "object",
                    "properties": {
                        "Authorization": {
                            "type": "string"
                        },
                        "x-userid": {
                            "type": "string"
                        },
                        "rando": {
                            "type": "string"
                        }
                    }
                },
                "queryStringParameters": {
                    "type": "object",
                    "properties": {
                        "filter": {
                            "type": "string"
                        }
                    }
                },
                "pathParameters": {
                    "type": "object",
                    "properties": {
                        "loggedIn": {
                            "type": "boolean",
                            "enum": [
                                true,
                                false
                            ]
                        }
                    }
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
                        "type": "object",
                        "properties": {
                            "message": {
                                "type": "string"
                            },
                            "data": {
                                "type": "object",
                                "properties": {
                                    "ss": {
                                        "type": "number"
                                    }
                                }
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
                        "type": "object",
                        "properties": {
                            "ss": {
                                "type": "number"
                            }
                        }
                    }
                }
            }
        ]
    }
}
```