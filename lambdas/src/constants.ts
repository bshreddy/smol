/* eslint-disable no-unused-vars */
export enum Status {
    SUCCESS = 'success',
    CLIENT_ERROR = 'client_error', // Use a different value
    INTERNAL_ERROR = 'internal_error' // Use a different value
  }

export const STATUS_CODE: Record<Status, number> = {
    [Status.SUCCESS]: 200,
    [Status.CLIENT_ERROR]: 400,
    [Status.INTERNAL_ERROR]: 500
};
