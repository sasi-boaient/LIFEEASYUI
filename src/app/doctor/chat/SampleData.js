import anitaPic from "../../../../public/assets/girl.jpg";
import raviPic from "../../../../public/assets/men.jpg";

export const sampleData = {
    patients: [
        {
            id: 1,
            name: "Anita Sharma",
            desc: "Diabetics Review",
            scheduletime: "11:30 AM",
            mrn: "MRN001",
            status: "Active",
            profilePic: anitaPic.src,
            age: 45,
            sex: "F",
            allergy: "Penicillin",
            condition: "Diabetes, Hypertension",
            vitals: { HR: 76, SpO2: "98%", BP: "120/80", Temp: "98.4°F" },
            labs: { glucose: 120, cholesterol: 180 },
            medications: ["Metformin", "Amlodipine"],
            messages: [
                { sender: "chatagent", text: "Hello Doctor, I've loaded Anita's case. Try /soap/labs/ or ask me to summarize triage?", time: "08:10 AM", date: "2025-10-13" },
                { sender: "You", text: "soap create with red flags", time: "08:12 AM", date: "2025-10-13" },
                { sender: "chatagent", text: "Drafting a SOAP template. I will surface risk flags and suggested orders online", time: "08:15 AM", date: "2025-10-13" },
            ],
            previousCheckups: [
                {
                    date: "2025-09-20",
                    vitals: { HR: 78, BP: "118/76", Temp: "98.6°F" },
                    labs: { glucose: 115, cholesterol: 175 },
                    medications: ["Metformin", "Amlodipine"],
                    notes: "Stable condition, advised diet control.",
                    desc: "Routine diabetic checkup.",
                    lastAppointment: "2025-09-20",
                },
            ],
        },
        {
            id: 2,
            name: "Ravi Patel",
            desc: "Hypertension Follow-up",
            scheduletime: "11:45 AM",
            mrn: "MRN002",
            age: 32,
            sex: "M",
            allergy: "None",
            status: "Active",
            profilePic: raviPic.src,
            condition: "Asthma",
            vitals: { HR: 82, SpO2: "95%", BP: "118/78", Temp: "98.9°F" },
            labs: { glucose: 110, cholesterol: 170 },
            medications: ["Salbutamol"],
            messages: [
                { sender: "chatagent", text: "Hello Doctor, I've loaded Ravi's case. Try /soap/labs/ or ask me to summarize triage?", time: "08:10 AM", date: "2025-10-13" },
                { sender: "You", text: "soap create with red flags", time: "08:12 AM", date: "2025-10-13" },
                { sender: "chatagent", text: "Drafting a SOAP template. I will surface risk flags and suggested orders online", time: "08:15 AM", date: "2025-10-13" },
            ],
            previousCheckups: [
                {
                    date: "2025-09-10",
                    vitals: { HR: 80, BP: "120/80", Temp: "98.7°F" },
                    labs: { glucose: 108, cholesterol: 165 },
                    medications: ["Salbutamol"],
                    notes: "Stable, continue current meds.",
                    desc: "Routine checkup.",
                    lastAppointment: "2025-09-10",
                },
            ],
        },
    ],
};