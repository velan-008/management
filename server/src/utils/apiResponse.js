/**
 * Standardized API Response Helper
 */
export const apiResponse = {
  success: (res, data = {}, message = 'Operation successful', statusCode = 200, meta = null) => {
    const responsePayload = {
      success: true,
      message,
      data
    };
    if (meta) {
      responsePayload.meta = meta;
    }
    return res.status(statusCode).json(responsePayload);
  },

  error: (res, message = 'An error occurred', statusCode = 500, code = 'INTERNAL_ERROR', details = []) => {
    const responsePayload = {
      success: false,
      error: {
        code,
        message,
        details
      }
    };
    return res.status(statusCode).json(responsePayload);
  }
};
