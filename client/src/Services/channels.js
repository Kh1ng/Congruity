const getServersList = async (userId) => {
  const token = localStorage.getItem("authToken"); // Retrieve token from storage

  if (!token) {
    throw new Error("User is not authenticated");
  }

  try {
    const response = await fetch(`/api/servers/${userId}}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`, // Include token for authentication
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to fetch servers");
    }

    const servers = await response.json();
    return servers;
  } catch (error) {
    console.error("Error fetching servers list:", error.message);
    throw error;
  }
};

export default getServersList;
