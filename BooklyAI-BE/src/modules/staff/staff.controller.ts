import type { Request, Response } from "express";
import { ForbiddenError } from "../../utils/app-error.js";
import { sendSuccess } from "../../utils/api-response.js";
import { staffService } from "./staff.service.js";
import type {
  CreateStaffInput,
  UpdateStaffInput,
  CreateStaffLeaveInput,
} from "./staff.schema.js";
import type { AuthUser } from "../../types/index.js";

function getBusinessId(user: AuthUser): string {
  if (user.role !== "BUSINESS" || !user.businessId) {
    throw new ForbiddenError("Only business owners can manage staff and permissions.");
  }
  return user.businessId;
}

export class StaffController {
  async list(req: Request, res: Response): Promise<void> {
    const businessId = getBusinessId(req.user!);
    const staff = await staffService.listByBusiness(businessId);
    sendSuccess(res, { staff });
  }

  async getById(req: Request, res: Response): Promise<void> {
    const businessId = getBusinessId(req.user!);
    const { id } = req.params as { id: string };
    const staff = await staffService.getById(businessId, id);
    sendSuccess(res, { staff });
  }

  async create(req: Request, res: Response): Promise<void> {
    const businessId = getBusinessId(req.user!);
    const staff = await staffService.create(businessId, req.body as CreateStaffInput);
    sendSuccess(res, { staff }, 201);
  }

  async update(req: Request, res: Response): Promise<void> {
    const businessId = getBusinessId(req.user!);
    const { id } = req.params as { id: string };
    const staff = await staffService.update(businessId, id, req.body as UpdateStaffInput);
    sendSuccess(res, { staff });
  }

  async delete(req: Request, res: Response): Promise<void> {
    const businessId = getBusinessId(req.user!);
    const { id } = req.params as { id: string };
    const result = await staffService.delete(businessId, id);
    sendSuccess(res, result);
  }

  async addLeave(req: Request, res: Response): Promise<void> {
    const businessId = getBusinessId(req.user!);
    const { id } = req.params as { id: string };
    const leave = await staffService.addLeave(
      businessId,
      id,
      req.body as CreateStaffLeaveInput,
    );
    sendSuccess(res, { leave }, 201);
  }

  async listLeaves(req: Request, res: Response): Promise<void> {
    const businessId = getBusinessId(req.user!);
    const { id } = req.params as { id: string };
    const leaves = await staffService.listLeaves(businessId, id);
    sendSuccess(res, { leaves });
  }

  async deleteLeave(req: Request, res: Response): Promise<void> {
    const businessId = getBusinessId(req.user!);
    const { id, leaveId } = req.params as { id: string; leaveId: string };
    const result = await staffService.deleteLeave(businessId, id, leaveId);
    sendSuccess(res, result);
  }
}

export const staffController = new StaffController();
