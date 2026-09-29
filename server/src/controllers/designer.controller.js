import * as designerService from "../services/designer.service.js";

export const listDesigns = async (req, res, next) => {
  try {
    const { farmId } = req.params;
    const designs = await designerService.listFarmDesigns(farmId, req.user);
    res.status(200).json({ success: true, data: designs });
  } catch (err) {
    next(err);
  }
};

export const getDesign = async (req, res, next) => {
  try {
    const { farmId, designId } = req.params;
    const design = await designerService.getFarmDesignById(farmId, designId, req.user);
    res.status(200).json({ success: true, data: design });
  } catch (err) {
    next(err);
  }
};

export const createDesign = async (req, res, next) => {
  try {
    const { farmId } = req.params;
    const design = await designerService.createFarmDesign(farmId, req.user, req.body);
    res.status(201).json({ success: true, data: design, message: "Design created successfully" });
  } catch (err) {
    next(err);
  }
};

export const updateDesign = async (req, res, next) => {
  try {
    const { farmId, designId } = req.params;
    const design = await designerService.updateFarmDesign(farmId, designId, req.user, req.body);
    res.status(200).json({ success: true, data: design, message: "Design updated successfully" });
  } catch (err) {
    next(err);
  }
};

export const deleteDesign = async (req, res, next) => {
  try {
    const { farmId, designId } = req.params;
    const result = await designerService.deleteFarmDesign(farmId, designId, req.user);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const duplicateDesign = async (req, res, next) => {
  try {
    const { farmId, designId } = req.params;
    const design = await designerService.duplicateFarmDesign(farmId, designId, req.user);
    res.status(201).json({ success: true, data: design, message: "Design duplicated successfully" });
  } catch (err) {
    next(err);
  }
};
