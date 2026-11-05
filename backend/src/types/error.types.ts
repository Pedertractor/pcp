export type FastifyValidationError = {
  statusCode: number;
  code: string;
  validation: {
    keyword: string;
    instancePath: string;
    message: string;
  }[];
};
