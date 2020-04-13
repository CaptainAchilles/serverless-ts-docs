import { HTTPEvent } from "./HTTPEvent"
import { AuthHeaders } from "./authHeaders"

export interface AuthorisedHTTPEvent<T> extends HTTPEvent<AuthHeaders & T> { }
