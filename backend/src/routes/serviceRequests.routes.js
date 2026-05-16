import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/rbac.middleware.js";
import { validateRequest } from "../middleware/validation.middleware.js";
import { requestUpload } from "../utils/upload.js";
import { ROLES } from "../utils/constants.js";
import {
  createServiceRequestController,
  getServiceRequestController,
  listAssignableWorkersController,
  listServiceRequestsController,
  updateServiceRequestController
} from "../controllers/serviceRequest.controller.js";
import {
  createServiceRequestValidation,
  updateServiceRequestValidation
} from "../validations/serviceRequest.validation.js";

export const serviceRequestsRouter = Router();

serviceRequestsRouter.use(authenticate);
serviceRequestsRouter.get(
  "/",
  authorize(ROLES.ADMIN, ROLES.SALES, ROLES.CUSTOMER, ROLES.FIELD_WORK),
  listServiceRequestsController
);
serviceRequestsRouter.get("/workers", authorize(ROLES.ADMIN, ROLES.SALES), listAssignableWorkersController);
serviceRequestsRouter.get(
  "/:id",
  authorize(ROLES.ADMIN, ROLES.SALES, ROLES.CUSTOMER, ROLES.FIELD_WORK),
  getServiceRequestController
);
serviceRequestsRouter.post(
  "/",
  authorize(ROLES.CUSTOMER),
  requestUpload.array("attachments", 8),
  createServiceRequestValidation,
  validateRequest,
  createServiceRequestController
);
serviceRequestsRouter.patch(
  "/:id",
  authorize(ROLES.ADMIN, ROLES.SALES),
  updateServiceRequestValidation,
  validateRequest,
  updateServiceRequestController
);

serviceRequestsRouter.post(
  "/:id/proof",
  authorize(ROLES.FIELD_WORK),
  requestUpload.array("proofs", 8),
  async (req, res, next) => {
    try {
      const { uploadProof } = await import("../services/serviceRequest.service.js");
      const data = await uploadProof(req.user, Number(req.params.id), req.files || [], req.body.note || null);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);
