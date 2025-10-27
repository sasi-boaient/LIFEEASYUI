// api.js
export const apiGet = async (url) => {
    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log("✅ GET Success:", data);
        return data;
    } catch (error) {
        console.error("❌ GET Error:", error.message);
        throw error;
    }
};

export const apiPut = async (url, payload) => {
    try {
        const response = await fetch(url, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log("✅ PUT Success:", data);
        return data;
    } catch (error) {
        console.error("❌ PUT Error:", error.message);
        throw error;
    }
};
