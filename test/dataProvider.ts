import { resolve } from "path"

const baseExpectedResult = (path: string) => [{
    "path": "../test/" + path,
    "summary": "Account Users",
    "description": "Gets of all the users in the account",
    "inputType": [
        {
            type: "object",
            properties: {
                "headers": {
                    type: "object",
            properties: {
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
                    type: "object",
            properties: {
                    "doTHeGuy": {
                        "type": "string"
                    }
                }
                },
                "pathParameters": {
                    type: "object",
            properties: {
                    "push": {
                        "type": "boolean",
                        enum: [true, false]
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
                        type: "object",
            properties: {
                        "message": {
                            "type": "string"
                        },
                        "data": {
                            type: "object",
            properties: {
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
                        type: "object",
            properties: {
                        "ss": {
                            "type": "number"
                        }
                    }
                }
                }
            }
        ]
    }
}];

export default [{
        // Inline Arrow function
        filePath: resolve(__dirname, "handlers/handler.inline.ts"),
        identifier: "handler",
        expectedResult: baseExpectedResult("handlers/handler.inline.ts")
    },
    {
        // Function declaration
        filePath: resolve(__dirname, "handlers/handler.function.ts"),
        identifier: "handler",
        expectedResult: baseExpectedResult("handlers/handler.function.ts")
    },
    // {
    //     // Arrow function with separate export
    //     filePath: resolve(__dirname, "handlers/handler.separate.export.ts"),
    //     identifier: "handler",
    //     expectedResult: baseExpectedResult("handlers/handler.separate.export.ts")
    // },
    // {
    //     // This one doesn't work. Export with type params
    //     filePath: resolve(__dirname, "handlers/handler.typeRef.ts"),
    //     identifier: "handler",
    //     expectedResult: baseExpectedResult("handlers/handler.typeRef.ts")
    // },
    {
    // Supports types with no generics
        filePath: resolve(__dirname, "handlers/handler.noGenerics.ts"),
        identifier: "handler",
        expectedResult: [{
            "path": "../test/handlers/handler.noGenerics.ts",
            "summary": "Account Users",
            "description": "Gets of all the users in the account",
            "inputType": [
                {
                    type: "object",
                    properties: {
                        "headers": {
                            "type": "object",
                            "properties": {
                                "rando": {
                                    "type": "string"
                                }
                            }
                        },
                        "queryStringParameters": {
                            "type": "object",
                            "properties": {
                                doTHeGuy: {
                                    type: "string"
                                }
                            }
                        },
                        "pathParameters": {
                            "type": "object",
                            "properties": {
                                "push": {
                                    "type": "boolean",
                                    "enum": [true, false]
                                }
                            }
                        }
                    }
                }
            ],
            "returns": {
                type: "object",
                properties: {
                    "statusCode": {
                        "type": "number"
                    },
                    "body": {
                        type: "object",
                        properties: {
                            "message": {
                                "type": "string"
                            },
                            "data": {
                                type: "object",
                                properties: {
                                    "ss": {
                                        "type": "number"
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }]
    },
    {
    // Supports generic overrides
    filePath: resolve(__dirname, "handlers/handler.overrideGeneric.ts"),
    identifier: "handler",
    expectedResult: [{
        "path": "../test/handlers/handler.overrideGeneric.ts",
        "summary": "Account Users",
        "description": "Gets of all the users in the account",
        "inputType": [
            {
                type: "object",
                properties: {
                    "headers": {
                        type: "object",
                        properties: {
                            "Authorization": {
                                "type": "number"
                            },
                            "x-userid": {
                                "type": "string"
                            },
                            "newHeader": {
                                "type": "string"
                            }
                        }
                    },
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
                            type: "object",
                            properties: {
                                "message": {
                                    "type": "string"
                                },
                                "data": {
                                    type: "object",
                                    properties: {
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
                            type: "object",
                            properties: {
                                "ss": {
                                    "type": "number"
                                }
                            }
                        }
                    }
                }
            ]
        }
    }]
}
]