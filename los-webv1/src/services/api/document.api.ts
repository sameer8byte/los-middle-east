import api from "../axios";



export const updateDocument = async (id: string, data: FormData) => {
  try {
    const response = await api.patch(`/documents/${id}`, data, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error updating document:", error);
    throw error;
  }
};
export const deleteDocument = async (id: string) => {
  try {
    const response = await api.delete(`/documents/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting document:", error);
    throw error;
  }
};


export const getDocumentByUser = async (userId: string) => {
  try {
    const response = await api.get(`/documents/by-user/${userId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching document by type:", error);
    throw error;
  }
};


