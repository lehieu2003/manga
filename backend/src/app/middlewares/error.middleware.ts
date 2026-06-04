import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { HttpError } from "../../shared/errors/http-error.js";

export function errorMiddleware(error: FastifyError, _request: FastifyRequest, reply: FastifyReply) {
  if (error instanceof ZodError) {
    return reply.code(400).send({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: error.flatten()
      }
    });
  }

  if (error instanceof HttpError) {
    return reply.code(error.statusCode).send({
      error: {
        code: error.code,
        message: error.message
      }
    });
  }

  if ("statusCode" in error && typeof error.statusCode === "number") {
    return reply.code(error.statusCode).send({
      error: {
        code: error.code ?? "REQUEST_ERROR",
        message: error.message
      }
    });
  }

  return reply.code(500).send({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Unexpected server error"
    }
  });
}
