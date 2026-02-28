import api from "../axios";

// @Controller("partner/brand/:brandId/evaluation")
export const upsertEvaluation = async (
  userId: string,
  brandId: string,
  loanId: string
) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/evaluation/${userId}/upsert`,
      { loanId }
    );
    return response.data;
  } catch (error) {
    console.error("Error sending SMS:", error);
    throw error;
  }
};

// @Get(":userId/evaluation/:evaluationId")
export const getEvaluation = async (
  userId: string,
  brandId: string,
  evaluationId: string
) => {
  try {
    const response = await api.get(
      `/partner/brand/${brandId}/evaluation/${userId}/evaluation/${evaluationId}`
    );
    return response.data;
  } catch (error) {
    console.error("Error sending SMS:", error);
    throw error;
  }
};

//   //updateEvaluationItem
//   @Post(":userId/evaluation/:evaluationId/updateEvaluationItem")
//   updateEvaluationItem(
//     @Param("userId") userId: string,
//     @Param("brandId") brandId: string,
//     @Param("evaluationId") evaluationId: string,
//     @Body() body: {
//       id: string;
//       status: "ELIGIBLE" | "NOT_ELIGIBLE";
//       override: boolean;
//       comments: string | null;
//     } // Adjust the type as per your DTO
//   ) {

export const updateEvaluationItem = async (
  userId: string,
  brandId: string,
  evaluationId: string,
  body: {
    id: string;
    status: "ELIGIBLE" | "NOT_ELIGIBLE";
    override: boolean;
    comments: string | null;
  }
) => {
  try {
    const response = await api.post(
      `/partner/brand/${brandId}/evaluation/${userId}/evaluation/${evaluationId}/updateEvaluationItem`,
      body
    );
    return response.data;
  } catch (error) {
    console.error("Error sending SMS:", error);
    throw error;
  }
};
