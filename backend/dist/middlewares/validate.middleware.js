export const validate = (schema) => async (req, _res, next) => {
    try {
        req.body = await schema.parseAsync(req.body);
        next();
    }
    catch (error) {
        next(error); // Se delega directamente a errorHandler
    }
};
