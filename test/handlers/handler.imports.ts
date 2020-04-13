import { AuthorisedHTTPEvent } from "./authorisedHttpEvent"

type APIResponseBody<T> = {
    message?: string,
    data: T
};

type APIResponse<T> = {
    statusCode: number;
    body: APIResponseBody<T>
} | APIResponseBody<T>

type HandlerEvent = {
    headers: {
        rando: string
    },
    queryStringParameters: {
        filter: string
    },
    pathParameters: {
        loggedIn: true | false
    }
};

type HandlerResponse = { ss: number };

/**
 * Account Users
 * Gets of all the users in the account
 * @param {number} a
 */
export const handler = (event: AuthorisedHTTPEvent<HandlerEvent>): APIResponse<HandlerResponse> => {
    const a = event.headers["x-userid"];

    event.pathParameters.loggedIn;

    const header = event.headers["authorization"];
    if (header > 200) {
        return {
            statusCode: 200,
            body: {
                message: "All done",
                data: {
                    ss: 900
                }
            }
        }
    }
    return {
        message: "All done",
        data: {
            ss: 900
        }
    }
}

