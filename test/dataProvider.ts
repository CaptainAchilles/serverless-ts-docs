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
                        "filter": {
                            "type": "string"
                        }
                    }
                },
                "pathParameters": {
                    type: "object",
                    properties: {
                        "loggedIn": {
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
{
    // Works with import chains
    filePath: resolve(__dirname, "handlers/handler.imports.ts"),
    identifier: "handler",
    expectedResult: baseExpectedResult("handlers/handler.imports.ts")
},
{
    // Works with Pick
    filePath: resolve(__dirname, "handlers/handler.pick.ts"),
    identifier: "handler",
    expectedResult: baseExpectedResult("handlers/handler.pick.ts")
},
{
    // Works with multiple generics
    filePath: resolve(__dirname, "handlers/handler.multipleGenerics.ts"),
    identifier: "handler",
    expectedResult: [{
        "path": "../test/handlers/handler.multipleGenerics.ts",
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
                    "pathParameters": {
                        type: "object",
                        properties: {
                            "loggedIn": {
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
                            "type": "number",
                            enum: [
                                200
                            ]
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
                                            "type": "boolean",
                                            enum: [true, false]
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
                                    "type": "boolean",
                                    enum: [true, false]
                                }
                            }
                        }
                    }
                }
            ]
        }
    }]
},
// {
//     // Arrow function with separate export
//     filePath: resolve(__dirname, "handlers/handler.separate.export.ts"),
//     identifier: "handler",
//     expectedResult: baseExpectedResult("handlers/handler.separate.export.ts")
// },
{
    // Export with named type params
    filePath: resolve(__dirname, "handlers/handler.typeRef.ts"),
    identifier: "handler",
    expectedResult: baseExpectedResult("handlers/handler.typeRef.ts")
},
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
                            filter: {
                                type: "string"
                            }
                        }
                    },
                    "pathParameters": {
                        "type": "object",
                        "properties": {
                            "loggedIn": {
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