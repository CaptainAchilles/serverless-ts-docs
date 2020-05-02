// interface LambdaHTTPEvent {
//     headers?: {
//         [key: string]: string
//     },
//     queryStringParameters?: {
//         [key: string]: string
//     },
//     multiValueQueryStringParameters?: {
//         [key: string]: string
//     },
//     pathParameters?: {
//         [key: string]: string
//     }
// }

// interface HTTPEvent<T extends LambdaHTTPEvent> {
//     headers?: T["headers"],
//     queryStringParameters?: T["queryStringParameters"],
//     multiValueQueryStringParameters?: T["multiValueQueryStringParameters"],
//     pathParameters?: T["pathParameters"],
// }

// type AuthHeaders = {
//     headers: {
//         Authorization: string;
//         "x-userid": string;
//     }
// }
// interface AuthorisedHTTPEvent<T> extends HTTPEvent<AuthHeaders & T> {}

// type APIResponseBody<T> = {
//     message?: string,
//     data: T
// };

// type APIResponse<T> = {
//     statusCode: number;
//     body: APIResponseBody<T>
// } | APIResponseBody<T>
// type HandlerEvent = {
//     headers: {
//         rando: string
//     },
//     queryStringParameters: {
//         filter: string
//     },
//     pathParameters: {
//         loggedIn: true | false
//     }
// };

// type HandlerResponse = { ss: number, omitProperty: string };

// /**
//  * Account Users
//  * Gets of all the users in the account
//  * @param {number} a
//  */
// export const handler = (event: AuthorisedHTTPEvent<HandlerEvent>): APIResponse<Pick<HandlerResponse, "ss">> => {
//     const a = event.headers["x-userid"];

//     event.pathParameters.loggedIn;

//     const header = event.headers["authorization"];
//     if (header > 200) {
//         return {
//             statusCode: 200,
//             body: {
//                 message: "All done",
//                 data: {
//                     ss: 900
//                 }
//             }
//         }
//     }
//     return {
//         message: "All done",
//         data: {
//             ss: 900
//         }
//     }
// }
type APIResponse<T> = {
    statusCode: number;
    bad: boolean;
    body: T
}
export const handler = (event: any): APIResponse<Pick<{ ss: number, sss: string }, "ss" | "sss">> => {
    return {
        statusCode: 200,
        bad: true,
        body: {
            ss: 12,
            sss: "asdf",
        }
    }
}

