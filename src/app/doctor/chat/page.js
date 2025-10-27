"use client"
import React, { useState, useMemo, useRef } from "react";
import {
    AppBar,
    Toolbar,
    IconButton,
    Avatar,
    Menu,
    MenuItem,
    Paper,
    InputBase,
    Chip,
    Button,
    ListItemIcon,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Box,
    Snackbar,
    Alert
} from "@mui/material";
import {
    Search as SearchIcon,
    MoreVert,
    Send,
    ArrowBackIosNew
} from "@mui/icons-material";
import { motion } from "framer-motion";
import { FaUser, FaCog, FaSignOutAlt, FaMicrophone, FaXRay, FaEdit, FaTimes } from "react-icons/fa";
import { MdMedicalServices } from "react-icons/md";
import { SiTicktick } from "react-icons/si";
import Image from "next/image";
import { sampleData } from "./SampleData";
import { apiGet, apiPut } from "@/api/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const profilePic = "/assets/doctor.png";
const logo = "/assets/logo.jpg";
const mriImage = "/assets/MRI.png";
const xrayImage = "/assets/Xray.png";

const defaultPatient = {
    id: 0,
    name: "No Active Patient",
    desc: "No patient selected",
    mrn: "-",
    age: "-",
    sex: "-",
    allergy: "-",
    condition: "N/A",
    vitals: { HR: "-", SpO2: "-", BP: "-", Temp: "-" },
    labs: { glucose: "-", cholesterol: "-" },
    medications: [],
    messages: [
        { sender: "chatagent", text: "No active patients. Please select or add a new patient.", time: "", date: "" },
    ],
    previousCheckups: [],
};

const VitalsCard = ({ title, value }) => (
    <div className="bg-white rounded-lg shadow-sm p-3 min-w-[120px] flex flex-col items-center">
        <div className="text-xs text-gray-400">{title}</div>
        <div className="font-semibold text-md mt-1">{value}</div>
    </div>
);

export default function DoctorChatDashboard() {
    const [selectedPatientId, setSelectedPatientId] = useState(sampleData.patients[0]?.id || null);
    const [search, setSearch] = useState("");
    const [tabIndex, setTabIndex] = useState(0);
    const [anchorEl, setAnchorEl] = useState(null);
    const [messageText, setMessageText] = useState("");
    const [patients, setPatients] = useState(sampleData.patients);
    const [isRecording, setIsRecording] = useState(false);
    const [latestSummaryReport, setLatestSummaryReport] = useState(null);
    const [alertOpen, setAlertOpen] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    // Filter only active patients
    const activePatients = patients.filter((p) => p.status === "Active");

    // Safe selected patient
    const selectedPatient = useMemo(
        () => activePatients.find((p) => p.id === selectedPatientId) || defaultPatient,
        [activePatients, selectedPatientId]
    );

    const handleClose = () => {
        if (!selectedPatientId) return;

        setPatients((prev) => {
            const updated = prev.map((p) =>
                p.id === selectedPatientId ? { ...p, status: "Inactive" } : p
            );

            const remainingActive = updated.filter((p) => p.status === "Active");

            if (remainingActive.length === 0) {
                setSelectedPatientId(null);
                return updated;
            }

            // Circular next selection
            const allIds = updated.map((p) => p.id);
            const currentIndex = allIds.indexOf(selectedPatientId);
            let nextId = null;
            for (let i = 1; i <= allIds.length; i++) {
                const nextIndex = (currentIndex + i) % allIds.length;
                if (updated[nextIndex].status === "Active") {
                    nextId = updated[nextIndex].id;
                    break;
                }
            }

            setTimeout(() => setSelectedPatientId(nextId), 0);
            return updated;
        });
    };

    const generateReportPDF = (report = {}, options = { download: true }) => {
        if (!report || Object.keys(report).length === 0) {
            console.warn("⚠️ No report data available to generate PDF.");
            return null;
        }

        const safeReport = {
            patient_id: report?.patient_id || "N/A",
            doctor_name: report?.doctor_name || "N/A",
            timestamp: report?.timestamp || new Date().toISOString(),
            chief_complaint: report?.chief_complaint || "N/A",
            symptoms: Array.isArray(report?.symptoms) ? report.symptoms : [],
            diagnosis: report?.diagnosis || "N/A",
            medications: Array.isArray(report?.medications) ? report.medications : [],
            advice: report?.advice || "N/A",
            follow_up: report?.follow_up || "N/A",
        };

        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text("Medical Summary Report", 105, 20, { align: "center" });

        doc.setFontSize(11);
        doc.text(`Patient ID: ${safeReport.patient_id}`, 14, 35);
        doc.text(`Doctor Name: ${safeReport.doctor_name}`, 14, 42);
        doc.text(`Date: ${new Date(safeReport.timestamp).toLocaleString()}`, 14, 49);

        const tableData = [
            ["Chief Complaint", safeReport.chief_complaint],
            ["Symptoms", safeReport.symptoms.length ? safeReport.symptoms.join(", ") : "N/A"],
            ["Diagnosis", safeReport.diagnosis],
            ["Medications", safeReport.medications.length ? safeReport.medications.join(", ") : "N/A"],
            ["Advice", safeReport.advice],
            ["Follow Up", safeReport.follow_up],
        ];

        autoTable(doc, {
            startY: 60,
            head: [["Field", "Details"]],
            body: tableData,
            theme: "grid",
            headStyles: { fillColor: "#1976d2", textColor: "#ffffff" },
            styles: { fontSize: 11, cellPadding: 3 },
        });

        doc.setFontSize(10);
        doc.setTextColor("#999999");
        doc.text("Generated by LifeEase Agent", 105, doc.internal.pageSize.getHeight() - 10, { align: "center" });

        // 🧾 Instead of saving, return blob
        const pdfBlob = doc.output("blob");

        if (options.download) {
            doc.save(`Medical_Summary_${safeReport.patient_id}.pdf`);
        }

        return pdfBlob;
    };

    const onSendMessage = () => {
        if (!messageText.trim() || selectedPatient.id === 0) return;

        const lowerText = messageText.toLowerCase();

        if (lowerText.includes("summary")) {
            if (!latestSummaryReport || Object.keys(latestSummaryReport).length === 0) {
                setAlertOpen(true);
                setMessageText("");
                return;
            }

            // Create a temporary PDF blob URL (instead of auto-download)
            const pdfBlob = generateReportPDF(latestSummaryReport, { download: false });
            const pdfUrl = URL.createObjectURL(pdfBlob);

            // Bot reply with a "Download PDF" link
            const botReply = {
                sender: "chatagent",
                text: "📄 Latest Summary report generated successfully.",
                pdfUrl,
                time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                date: new Date().toISOString().split("T")[0],
            };

            selectedPatient.messages.push(botReply);
            setMessageText("");
            setSearch((s) => s + "");
            return;
        }

        // ✅ Add normal message
        const newMessage = {
            sender: "You",
            text: messageText.trim(),
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            date: new Date().toISOString().split("T")[0],
        };

        selectedPatient.messages.push(newMessage);
        setMessageText("");
        setSearch((s) => s + "");
    };

    const defaultReport = {
        doctor_details: { name: "", specialization: "" },
        patient_details: { name: "", id: "", age_gender: "" },
        consultation_summary: {
            chief_complaint: "",
            history_of_present_illness: "",
            past_medical_history: "",
            examination_findings: "",
            investigations_or_tests: ""
        },
        doctor_advice_plan: "",
        follow_up: { mode: "", next_visit: "" },
        additional_notes: "",
        prescription: []
    };

    const [openMRI, setOpenMRI] = useState(false);
    const [openXRay, setOpenXRay] = useState(false);
    const [openEditSummary, setOpenEditSummary] = useState(false);
    const [editableReport, setEditableReport] = useState(defaultReport);
    // const [reportIds, setReportId] = useState(null);

    const handleOpenEditSummary = async () => {
        console.log("edit Clicked.....");
        console.log("lastReportMessage", selectedPatient);
        const patientId = "111";
        const medical_report_url = `https://sttboaient.onrender.com/report-data/${patientId}`;

        try {
            const data = await apiGet(medical_report_url);
            console.log("✅ Data fetched successfully:", data?.report_data);
            setEditableReport(data?.report_data);
            setOpenEditSummary(true);
        } catch (error) {
            console.error("❌ Failed to fetch report:", error.message);
        }
    };

    const handleSaveReport = async () => {
        if (!editableReport) return;
        const patientId = "111";
        const doctorName = "rec";

        // 🧠 Flattened payload structure
        const payload = {
            patient_id: patientId,
            doctor_name: doctorName,
            timestamp: new Date().toISOString(),
            // Map fields from your editableReport structure
            chief_complaint: editableReport.chief_complaint || "",
            symptoms: editableReport.symptoms || [],
            diagnosis: editableReport.diagnosis || "",
            medications: editableReport.medications || [],
            advice: editableReport.advice || "",
            follow_up: editableReport.follow_up || "",
        };

        console.log("📝 Final Payload (Flat):", JSON.stringify(payload, null, 2));

        const medical_report_update_url = `https://sttboaient.onrender.com/update-report-data/${patientId}`;
        const medical_report_get_url = `https://sttboaient.onrender.com/report-data/${patientId}`;

        try {
            await apiPut(medical_report_update_url, payload);
            console.log("✅ Report saved successfully");

            // 🔁 Re-fetch updated data after saving
            const updatedData = await apiGet(medical_report_get_url);
            setLatestSummaryReport(updatedData?.report_data);
            // Add as a new chat message
            const reportMessage = {
                sender: "You",
                text: "Summary Report",  // or any custom text
                report: updatedData?.report_data || null,
                time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                date: new Date().toISOString().split("T")[0],
            };

            // Push to messages array
            selectedPatient.messages.push(reportMessage);

            // Update patients state
            setPatients([...patients]);
            // setEditableReport(updatedData?.report_data);
            console.log("🔄 Refetched updated report:", updatedData);
        } catch (error) {
            console.error("❌ Error during save or refresh:", error.message);
        }

        setOpenEditSummary(false);
    };

    const handleCloseMRI = () => setOpenMRI(false);

    const handleCloseXRay = () => setOpenXRay(false);

    // const TRANSLATE_AUDIO_API_URL = "https://sttboaient.onrender.com/api/v1/combined/transcribe-and-summarize";

    // Reference to hidden file input
    // const fileInputRef = useRef(null);

    // const handleFileChange = async (e) => {
    //     const file = e.target.files[0];
    //     if (!file || selectedPatient.id === 0) return;

    //     const typingMessage = {
    //         sender: "chatagent",
    //         text: "Translating audio...",
    //         time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    //         date: new Date().toISOString().split("T")[0],
    //         typing: true
    //     };

    //     selectedPatient.messages.push(typingMessage);
    //     setPatients([...patients]);

    //     const formData = new FormData();
    //     formData.append("files", file); // must match FastAPI param

    //     console.log("API URL:", TRANSLATE_AUDIO_API_URL);

    //     for (let [key, value] of formData.entries()) {
    //         console.log(`FormData - ${key}:`, value);
    //     }

    //     try {
    //         const response = await fetch(TRANSLATE_AUDIO_API_URL, {
    //             method: "POST",
    //             body: formData,
    //         });
    //         const data = await response.json();
    //         // console.log('data', data);
    //         // Remove typing message
    //         selectedPatient.messages = selectedPatient.messages.filter(m => !m.typing);

    //         const firstTranslation = data?.translations?.[0] || null;
    //         const reportId = data?.translations?.[0]?.report?.report_id || null;
    //         console.log("reportId", reportId);
    //         setReportId(reportId);
    //         const transcriptionMessage = {
    //             sender: "chatagent",
    //             text: firstTranslation?.transcription || "No transcription available.",
    //             report: firstTranslation?.report || null,  // use null instead of string
    //             time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    //             date: new Date().toISOString().split("T")[0],
    //         };
    //         // Add the bot's transcription message
    //         // const transcriptionMessage = {
    //         //     sender: "chatagent",
    //         //     text: data.translations?.[0]?.transcription || "No transcription available.",
    //         //     report: data.translations?.[0]?.report || "No Reports available.",
    //         //     time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    //         //     date: new Date().toISOString().split("T")[0],
    //         // };
    //         selectedPatient.messages.push(transcriptionMessage);

    //         setPatients([...patients]);
    //     } catch (err) {
    //         console.error(err);
    //         selectedPatient.messages = selectedPatient.messages.filter(m => !m.typing);
    //         selectedPatient.messages.push({
    //             sender: "chatagent",
    //             text: "Failed to translate audio.",
    //             time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    //             date: new Date().toISOString().split("T")[0],
    //         });
    //         setPatients([...patients]);
    //     } finally {
    //         // RESET file input so user can select same file again
    //         if (fileInputRef.current) {
    //             fileInputRef.current.value = null;
    //         }
    //     }
    // };

    // const handleUploadClick = () => {
    //     if (fileInputRef.current) {
    //         fileInputRef.current.click(); // open file picker
    //     }
    // };

    // Render the summary report as a neat HTML card

    const renderSummary = (report) => {
        if (!report) return null;

        return (
            <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 text-gray-700 space-y-2 text-[13px]">
                <div className="flex items-center justify-between">
                    <strong>🩺 Summary Report</strong>
                    <span className="text-xs text-gray-500">
                        {new Date(report.timestamp).toLocaleString()}
                    </span>
                </div>

                <div className="mt-1 text-sm">
                    <div><strong>Patient ID:</strong> {report.patient_id}</div>
                    <div><strong>Doctor:</strong> {report.doctor_name}</div>
                </div>

                <div className="mt-2">
                    <div><strong>Chief Complaint : </strong></div>
                    <div className="text-sm">{report.chief_complaint || "—"}</div>
                </div>

                <div className="mt-2">
                    <div><strong>Symptoms : </strong></div>
                    <div className="text-sm">{report.symptoms?.length ? report.symptoms.join(", ") : "—"}</div>
                </div>

                <div className="mt-2">
                    <div><strong>Diagnosis: </strong></div>
                    <div className="text-sm">{report.diagnosis || "—"}</div>
                </div>

                <div className="mt-2">
                    <div><strong>Medications : </strong></div>
                    <div className="text-sm">
                        {report.medications?.length
                            ? report.medications.map((m, i) => (
                                <div key={i}>
                                    {m.medicine_name || "—"} {m.dosage ? `| ${m.dosage}` : ""}
                                </div>
                            ))
                            : "—"}
                    </div>
                </div>

                <div className="mt-2">
                    <div><strong>Advice : </strong></div>
                    <div className="text-sm">{report.advice || "—"}</div>
                </div>

                <div className="mt-2">
                    <div> <strong>Follow Up : </strong></div>
                    <div className="text-sm">{report.follow_up || "—"}</div>
                </div>
            </div>
        );
    };

    const wsRef = useRef(null);
    const audioCtxRef = useRef(null);

    const handleMicClick = async () => {
        if (!isRecording) {
            const ws = new WebSocket("wss://sttboaient.onrender.com/ws/translate");
            wsRef.current = ws;

            ws.onopen = async () => {
                console.log("✅ WebSocket connected");

                ws.send(
                    JSON.stringify({
                        type: "session_info",
                        patient_id: "111",
                        dr_name: "rec",
                    })
                );

                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)({
                    sampleRate: 16000,
                });
                const source = audioCtx.createMediaStreamSource(stream);
                const processor = audioCtx.createScriptProcessor(4096, 1, 1);

                // 🎤 Start recording audio
                processor.onaudioprocess = (e) => {
                    if (ws.readyState !== 1) return;
                    const input = e.inputBuffer.getChannelData(0);
                    const pcmData = new Int16Array(input.length);
                    for (let i = 0; i < input.length; i++) {
                        const s = Math.max(-1, Math.min(1, input[i]));
                        pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
                    }
                    const base64 = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
                    ws.send(JSON.stringify({ type: "audio", audio: base64 }));
                };

                source.connect(processor);
                processor.connect(audioCtx.destination);
                audioCtxRef.current = audioCtx;
                setIsRecording(true);

                // 🎬 Add a single "live" message entry
                selectedPatient.messages.push({
                    sender: "chatagent",
                    text: "",
                    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                    date: new Date().toISOString().split("T")[0],
                    isLive: true, // 👈 mark this message as live
                });
                setPatients([...patients]);
                console.log("🎙️ Started capturing & streaming audio...");
            };

            // 🧠 Accumulate live transcript
            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === "transcript" && data.text) {
                        console.log("🌐 Translation output:", data.text);

                        // Find current live message
                        const liveMsg = selectedPatient.messages.find((m) => m.isLive);
                        if (liveMsg) {
                            // Append new text into same bubble
                            liveMsg.text = (liveMsg.text + " " + data.text).trim();
                            setPatients([...patients]);
                        }
                    }
                } catch (err) {
                    console.error("❌ Parse error:", err);
                }
            };

            ws.onclose = () => {
                console.log("🔒 WebSocket closed");
                setIsRecording(false);
            };

            ws.onerror = (err) => {
                console.error("❌ WebSocket error:", err);
                setIsRecording(false);
            };
        } else {
            // 🛑 Stop recording
            setIsRecording(false);
            console.log("🛑 Stopped streaming audio");

            if (wsRef.current && wsRef.current.readyState === 1) {
                wsRef.current.send(JSON.stringify({ type: "close" }));
                wsRef.current.close();
            }
            audioCtxRef.current?.close();

            try {
                // 1️⃣ Get full transcription
                const transcriptionRes = await fetch(
                    "https://sttboaient.onrender.com/transcriptions?limit=1000&patient_id=111&dr_name=rec"
                );
                const transcriptionJson = await transcriptionRes.json();
                const transcriptionData = transcriptionJson?.transcriptions?.[0]?.transcription_data || "";

                if (transcriptionData) {
                    console.log("🧾 Final transcription:", transcriptionData);

                    // Update chat with full transcription
                    const liveMsg = selectedPatient.messages.find((m) => m.isLive);
                    if (liveMsg) {
                        liveMsg.text = transcriptionData;
                        delete liveMsg.isLive;
                    } else {
                        selectedPatient.messages.push({
                            sender: "chatagent",
                            text: transcriptionData,
                            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                            date: new Date().toISOString().split("T")[0],
                        });
                    }
                    setPatients([...patients]);

                    // 2️⃣ Show temporary "Loading summary..." message
                    const loadingMsg = {
                        sender: "chatagent",
                        text: "⏳ Generating summary report...",
                        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                        date: new Date().toISOString().split("T")[0],
                        isLoading: true,
                    };
                    selectedPatient.messages.push(loadingMsg);
                    setPatients([...patients]);

                    try {
                        // 3️⃣ Generate summary
                        console.log("📤 Generating summary...");
                        await fetch("https://sttboaient.onrender.com/generate-summary/111", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ transcription_data: transcriptionData }),
                        });

                        // 4️⃣ Fetch summary report
                        console.log("📥 Fetching summary report...");
                        const reportRes = await fetch("https://sttboaient.onrender.com/report-data/111");
                        const reportJson = await reportRes.json();
                        const report = reportJson?.report_data;
                        setLatestSummaryReport(report)

                        //                         if (report) {
                        //                             // 🧠 Properly formatted multi-line summary
                        //                             const formattedReport = `
                        // 🩺 **Summary Report**

                        // **Patient ID:** ${report.patient_id}
                        // **Doctor:** ${report.doctor_name}
                        // **Date:** ${new Date(report.timestamp).toLocaleString()}

                        // **Chief Complaint:** ${report.chief_complaint || "—"}
                        // **Symptoms:** ${report.symptoms?.length ? report.symptoms.join(", ") : "—"}
                        // **Diagnosis:** ${report.diagnosis || "—"}
                        // **Medications:** ${report.medications?.length
                        //                                     ? report.medications.map((m) => `${m.medicine_name || ""} ${m.dosage || ""}`).join(", ")
                        //                                     : "—"
                        //                                 }
                        // **Advice:** ${report.advice || "—"}
                        // **Follow Up:** ${report.follow_up || "—"}
                        //                     `.trim();

                        //                             // Replace "loading" message with final summary
                        //                             loadingMsg.text = formattedReport;
                        //                             delete loadingMsg.isLoading;
                        //                             setPatients([...patients]);
                        //                             console.log("✅ Summary added to chat");
                        //                         }
                        if (report) {
                            // remove loading message
                            selectedPatient.messages = selectedPatient.messages.filter((m) => !m.isLoading);

                            // push final transcription as message (already done above)
                            // now push the report object as a message
                            selectedPatient.messages.push({
                                sender: "chatagent",
                                report: report, // store raw report object
                                time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                                date: new Date().toISOString().split("T")[0],
                                isSummary: true,
                            });

                            setPatients([...patients]);
                            console.log("✅ Summary added to chat");
                        }

                        else {
                            throw new Error("No report_data found");
                        }
                    } catch (innerErr) {
                        console.error("⚠️ Summary fetch failed:", innerErr);
                        loadingMsg.text = "⚠️ Summary fetch failed.";
                        delete loadingMsg.isLoading;
                        setPatients([...patients]);
                    }
                }
            } catch (err) {
                console.error("❌ Error in transcription → summary pipeline:", err);
                selectedPatient.messages.push({
                    sender: "chatagent",
                    text: "⚠️ Summary fetch failed due to network or API issue.",
                    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                    date: new Date().toISOString().split("T")[0],
                });
                setPatients([...patients]);
            }
        }

    };

    const handleApproveReport = async () => {
        const patientId = "111";
        const approvalUrl = `https://sttboaient.onrender.com/approval/${patientId}?approval=true`;

        // ✅ Body can be empty or contain the current report data
        const payload = {
            report_data: editableReport || {}
        };

        console.log("🟢 Approval payload:", JSON.stringify(payload, null, 2));

        try {
            const response = await fetch(approvalUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    accept: "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();

            console.log("✅ Approval response:", data);

            // Add confirmation in chat
            const approvalMessage = {
                sender: "🤖 LifeEase Agent",
                text: `✅ Report approved successfully for Patient ID: ${patientId}`,
                time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                date: new Date().toISOString().split("T")[0],
            };

            selectedPatient.messages.push(approvalMessage);
            setPatients([...patients]);
        } catch (error) {
            console.error("❌ Approval error:", error);
        }
    };

    return (
        <div className="h-screen flex flex-col bg-gray-100 text-gray-800 text-sm">
            {/* AppBar */}
            <div className="h-[10%]">
                <AppBar position="sticky" color="transparent" elevation={0} className="backdrop-blur-sm h-full">
                    <Toolbar className="flex justify-between p-2 h-full">
                        <div className="flex items-center gap-2">
                            <Avatar src={logo} sx={{ width: 44, height: 44, fontWeight: 600, zIndex: 10, padding: "1px" }}>LE</Avatar>
                            <div>
                                <div className="text-lg font-semibold text-[#386ec0] hover:text-[#2a5dab] transition-colors duration-300">LifeEase</div>
                                <div className="text-[13px] text-[#0c10fc]">Doctor's Virtual Assistant</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2">
                                <div className="text-right hidden sm:block">
                                    <div className="font-semibold text-[12px]">Dr. John Doe</div>
                                    <div className="text-[11px] text-gray-400">Cardiologist</div>
                                </div>
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="relative">
                                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-400 opacity-60 blur-sm"></div>
                                    <Avatar src={profilePic} sx={{ width: 44, height: 44, border: "2px solid white", zIndex: 10 }}>JD</Avatar>
                                </motion.div>
                                <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
                                    <MoreVert fontSize="small" />
                                </IconButton>
                                <Menu
                                    anchorEl={anchorEl}
                                    open={Boolean(anchorEl)}
                                    onClose={() => setAnchorEl(null)}
                                    PaperProps={{
                                        sx: {
                                            backdropFilter: "blur(10px)",
                                            backgroundColor: "rgba(255,255,255,0.7)",
                                            borderRadius: "1rem",
                                            boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
                                        },
                                    }}
                                >
                                    <MenuItem onClick={() => console.log("Profile clicked")}>
                                        <ListItemIcon><FaUser style={{ color: "#4F46E5", minWidth: 20 }} /></ListItemIcon>
                                        Profile
                                    </MenuItem>
                                    <MenuItem onClick={() => console.log("Settings clicked")}>
                                        <ListItemIcon><FaCog style={{ color: "#F59E0B", minWidth: 20 }} /></ListItemIcon>
                                        Settings
                                    </MenuItem>
                                    <MenuItem onClick={() => console.log("Logout clicked")}>
                                        <ListItemIcon><FaSignOutAlt style={{ color: "#EF4444", minWidth: 20 }} /></ListItemIcon>
                                        Logout
                                    </MenuItem>
                                </Menu>
                            </div>
                        </div>
                    </Toolbar>
                </AppBar>
            </div>

            {/* Main Grid */}
            <div className="h-[90%] p-2 grid grid-cols-12 gap-2">
                {/* Left Sidebar */}
                <div className="col-span-12 lg:col-span-3 h-full">
                    <div className="bg-white rounded-xl shadow flex flex-col h-full">
                        {/* Search */}
                        <div className="h-[10%] p-2">
                            <Paper className="p-1 flex items-center h-full" elevation={0}>
                                <IconButton size="small"><SearchIcon fontSize="small" /></IconButton>
                                <InputBase placeholder="Search..." fullWidth value={search} onChange={(e) => setSearch(e.target.value)} className="text-[11px]" />
                            </Paper>
                        </div>

                        {/* Appointments */}
                        <div className="h-[55%] flex flex-col overflow-y-auto p-2">
                            <h4 className="text-gray-600 text-sm font-semibold">Appointments</h4>
                            <div className="mt-2 space-y-2">
                                {activePatients.length === 0 ? (
                                    <div className="text-gray-400 text-[12px] p-2">No active patients</div>
                                ) : (
                                    activePatients.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || !search)
                                        .map((p) => (
                                            <motion.div key={p.id} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                                                onClick={() => setSelectedPatientId(p.id)}
                                                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer ${p.id === selectedPatientId ? "bg-slate-100" : "bg-gray-50"}`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Box
                                                        sx={{
                                                            position: "relative",
                                                            width: 32,
                                                            height: 32,
                                                            borderRadius: "50%",
                                                            overflow: "hidden",
                                                            boxShadow: "0 4px 8px rgba(0,0,0,0.2)", // soft shadow
                                                        }}
                                                    >
                                                        <Avatar
                                                            alt={p.name.split(" ").map(s => s[0]).slice(0, 2).join("")}
                                                            src={p.profilePic}
                                                            sx={{ width: "100%", height: "100%" }}
                                                        />
                                                        <Box
                                                            sx={{
                                                                position: "absolute",
                                                                top: 0,
                                                                left: 0,
                                                                width: "100%",
                                                                height: "100%",
                                                                background: "linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 60%)",
                                                            }}
                                                        />
                                                    </Box>


                                                    <div>
                                                        <div className="font-semibold text-[12px]">{p.name}</div>
                                                        <div className="text-[11px] text-gray-500">{p.desc}</div>
                                                    </div>
                                                </div>
                                                <div className="text-[11px] text-gray-500">{p.scheduletime}</div>
                                            </motion.div>
                                        ))
                                )}
                            </div>
                        </div>

                        {/* Separator */}
                        <div className="w-full h-1 my-2 rounded-full bg-white/20 backdrop-blur-sm shadow-sm"></div>

                        {/* Previous History */}
                        <div className="h-[35%] flex flex-col overflow-y-auto p-2">
                            <h4 className="text-gray-600 text-sm font-semibold">Previous History</h4>
                            <div className="mt-2 space-y-2">
                                {selectedPatient.previousCheckups.length === 0 ? (
                                    <div className="text-gray-400 text-[12px] p-2">No previous history</div>
                                ) : (
                                    selectedPatient.previousCheckups.map((c, idx) => (
                                        <motion.div key={idx} className="bg-gradient-to-tr from-white to-slate-50 p-2 rounded-lg shadow-sm" whileHover={{ x: 4 }}>
                                            <div className="text-[12px] font-semibold">{c.desc}</div>
                                            <div className="text-[11px] text-gray-500 mt-1">Last Appointment: {c.lastAppointment || "-"}</div>
                                            <div className="flex items-center gap-1 mt-1">
                                                <Chip label={`HR: ${c.vitals.HR} BPM`} size="small" />
                                                <Chip label={`BP: ${c.vitals.BP}`} size="small" />
                                                <Chip label={`Temp: ${c.vitals.Temp}`} size="small" />
                                            </div>
                                            <div className="text-[11px] text-gray-600 mt-1">{c.notes}</div>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Center Chat */}
                <div className="col-span-12 lg:col-span-6 h-[calc(100vh-75px)]">
                    <div className="bg-white rounded-xl shadow flex flex-col h-full">

                        {/* Chat Header */}
                        <div className="border-b border-gray-300 px-3 py-2 flex items-center justify-between flex-none">
                            <div className="flex items-center gap-2">
                                <IconButton size="small" className="hidden lg:block"><ArrowBackIosNew fontSize="small" /></IconButton>
                                <div className="flex items-center gap-2">
                                    <Avatar
                                        alt={selectedPatient.name.split(" ").map(s => s[0]).slice(0, 2).join("")}
                                        src={selectedPatient.profilePic}
                                        sx={{ width: 28, height: 28 }}
                                    />
                                    <div>
                                        <div className="font-semibold text-[12px]">{selectedPatient.name}</div>
                                        <div className="text-[11px] text-gray-500">{selectedPatient.desc}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="text-[11px] text-gray-600 font-semibold">
                                {selectedPatient.mrn} · {selectedPatient.age} yrs, {selectedPatient.sex}
                            </div>
                        </div>

                        {/* Chat Messages */}
                        <div className="flex-1 p-3 space-y-2 overflow-y-auto">
                            {selectedPatient.messages.map((m, i) => {
                                const isMe = m.sender === "You";
                                const hasReport = m.report;
                                return (
                                    <div key={i} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                                        <motion.div
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            whileHover={{ scale: 1.01 }}
                                            className={`rounded-xl px-3 py-2 font-semibold max-w-[70%] ${isMe ? "bg-blue-200 text-gray-600" : "bg-gray-100 text-gray-800"}`}
                                        >
                                            {!isMe && (
                                                <div className="flex items-center gap-1 mb-1 text-[11px] text-blue-500">
                                                    <span role="img">🤖</span> LifeEase Agent · {m.time}
                                                </div>
                                            )}
                                            <div className="text-[12px] space-y-2">
                                                {/* Transcription text */}
                                                {/* <p>{m.text}</p>
                                                {m.audioUrl && (
                                                    <audio controls src={m.audioUrl} className="mt-1 w-full rounded-md" />
                                                )} */}

                                                {/* If this message contains a report object, render the nice HTML using renderSummary */}
                                                {m.pdfUrl ? (
                                                    <div className="flex flex-col items-start space-y-1">
                                                        <p>{m.text}</p>
                                                        <a
                                                            href={m.pdfUrl}
                                                            download="Medical_Summary.pdf"
                                                            className="inline-block bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-md hover:bg-blue-600 transition"
                                                        >
                                                            ⬇️ Download PDF
                                                        </a>
                                                    </div>
                                                ) : m.report ? (
                                                    renderSummary(m.report)
                                                ) : (
                                                    <>
                                                        {/* Transcription / normal text */}
                                                        <p className="whitespace-pre-line">{m.text}</p>

                                                        {m.audioUrl && (
                                                            <audio controls src={m.audioUrl} className="mt-1 w-full rounded-md" />
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                            {isMe && (
                                                <div className="text-[10px] text-black mt-1 text-right">
                                                    <span role="img" aria-label="doctor" className="text-lg">👩‍⚕️</span>You · {m.time}
                                                </div>
                                            )}
                                        </motion.div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Chat Input */}
                        <div className="border-t border-gray-300 px-3 py-2 flex items-center gap-2 flex-none">
                            <div className="relative flex-1">
                                <textarea
                                    value={messageText}
                                    onChange={(e) => setMessageText(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            onSendMessage();
                                        }
                                    }}
                                    disabled={selectedPatient.id === 0}
                                    rows={2}
                                    className="w-full bg-gray-200 rounded-full px-3 py-2 text-[12px] outline-none resize-none min-h-[48px] max-h-[96px] overflow-y-auto"
                                    onFocus={() => setIsFocused(true)}
                                    onBlur={() => setIsFocused(false)}
                                />
                                {!messageText && !isFocused && (
                                    <span className="absolute left-3 top-1/2 -translate-y-[70%] text-gray-400 text-[12px] pointer-events-none select-none">
                                        Type a message...
                                    </span>
                                )}
                            </div>
                            <IconButton
                                onClick={onSendMessage}
                                sx={{
                                    color: '#090E6B',
                                    backgroundColor: 'white',
                                    borderRadius: '50%',
                                    width: 36,
                                    height: 36,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    top: -2,
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                    '&:hover': {
                                        backgroundColor: 'rgba(9,14,107,0.1)',
                                        boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
                                    },
                                    '& svg': { fontSize: 18 },
                                }}
                                disabled={selectedPatient.id === 0}
                            >
                                <Send className="pl-1 pt-0.5" />
                            </IconButton>
                        </div>

                        {/* Buttons */}
                        <div className="flex items-center gap-2 px-4 py-2 flex-nowrap overflow-x-auto w-full">
                            <Button
                                startIcon={<MdMedicalServices size={14} />}
                                disableElevation
                                sx={{
                                    minWidth: "auto", padding: "4px 12px", fontSize: "12px", borderRadius: "9999px",
                                    textTransform: "none", backgroundColor: "#f3f3f3",
                                    color: "#4B5563", "&:hover": { backgroundColor: "#e5e5e5" },
                                }}
                                variant="contained"
                                onClick={() => {
                                    console.log("MRI button clicked!");
                                    setOpenMRI(true);
                                }}
                            >
                                MRI
                            </Button>

                            <Button
                                startIcon={<FaXRay size={14} />}
                                disableElevation
                                sx={{
                                    minWidth: "auto", padding: "4px 12px", fontSize: "12px", borderRadius: "9999px",
                                    textTransform: "none", whiteSpace: "nowrap", backgroundColor: "#f3f3f3",
                                    color: "#4B5563", "&:hover": { backgroundColor: "#e5e5e5" },
                                }}
                                variant="contained"
                                onClick={() => {
                                    console.log("X-Ray button clicked!");
                                    setOpenXRay(true);
                                }}
                            >
                                X-Ray
                            </Button>

                            <Button
                                startIcon={<FaEdit size={14} />}
                                disableElevation
                                sx={{
                                    minWidth: "auto", padding: "4px 12px", fontSize: "12px", borderRadius: "9999px",
                                    textTransform: "none", backgroundColor: "#f3f3f3",
                                    color: "#4B5563", "&:hover": { backgroundColor: "#e5e5e5" },
                                }}
                                variant="contained"
                                onClick={handleOpenEditSummary}
                            >
                                Edit
                            </Button>

                            <Button startIcon={<FaMicrophone size={14} />} disableElevation variant="contained"
                                sx={{
                                    minWidth: "auto", padding: "4px 12px", fontSize: "12px", borderRadius: "9999px",
                                    textTransform: "none", backgroundColor: isRecording ? "#EF4444" : "#f3f3f3",
                                    color: isRecording ? "#fff" : "#4B5563", "&:hover": { backgroundColor: isRecording ? "#DC2626" : "#e5e5e5" },
                                }}
                                onClick={handleMicClick}
                            >
                                {isRecording ? "Recording..." : "Record"}
                            </Button>

                            <Button startIcon={<SiTicktick size={14} />} disableElevation variant="contained"
                                sx={{
                                    minWidth: "auto", padding: "4px 12px", fontSize: "12px", borderRadius: "9999px",
                                    textTransform: "none", backgroundColor: "#f3f3f3", color: "#4B5563",
                                    "&:hover": { backgroundColor: "#e5e5e5" },
                                }}
                                onClick={() => handleApproveReport()}
                            >
                                Approve
                            </Button>

                            <Button startIcon={<FaTimes size={14} />} disableElevation variant="contained"
                                sx={{
                                    minWidth: "auto", padding: "4px 12px", fontSize: "12px", borderRadius: "9999px",
                                    textTransform: "none", backgroundColor: "#f3f3f3", color: "#4B5563",
                                    "&:hover": { backgroundColor: "#e5e5e5" },
                                }}
                                onClick={handleClose} disabled={selectedPatient.id === 0}
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Right Panel */}
                <div className="col-span-12 lg:col-span-3 h-full">
                    <div className="bg-white rounded-xl shadow p-3 flex flex-col h-full overflow-y-auto">
                        <div className="p-3 rounded-xl bg-white/20 backdrop-blur-md shadow-lg space-y-3">
                            {/* Patient Info */}
                            <div className="flex items-start">
                                <div>
                                    <div className="font-semibold text-[13px]">{selectedPatient.name}</div>
                                    <div className="text-[11px] text-gray-500 font-semibold">{selectedPatient.mrn}</div>
                                </div>
                                <div className="ml-2 text-[12px] text-gray-500 text-right">
                                    ({selectedPatient.age} yrs, {selectedPatient.sex})
                                </div>
                            </div>

                            {/* Allergies */}
                            <div>
                                <span className="text-[12px] font-semibold text-gray-500">Allergies</span>
                                <div className="mt-1">
                                    <Chip label={selectedPatient.allergy} size="small" />
                                </div>
                            </div>

                            {/* Conditions */}
                            <div>
                                <span className="text-[12px] font-semibold text-gray-500">Conditions</span>
                                <div className="mt-1 flex gap-1">
                                    {selectedPatient.condition.split(",").map((c, i) => (
                                        <Chip key={i} label={c.trim()} size="small" />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="mt-2 p-3 rounded-xl bg-white/20 backdrop-blur-md shadow-lg">
                            <div className="flex border-b border-gray-300">
                                {["Vitals", "Labs", "Medications"].map((label, idx) => (
                                    <button key={idx} onClick={() => setTabIndex(idx)}
                                        className={`flex-1 text-[13px] font-semibold py-2 ${tabIndex === idx ? "border-b-2 border-gray-500 text-gray-900" : "text-gray-500"} text-center`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>

                            <div className="mt-3 space-y-3">
                                {/* Vitals */}
                                {tabIndex === 0 && (
                                    <div className="grid grid-cols-2 gap-2">
                                        {Object.entries(selectedPatient.vitals).map(([k, v], i) => (
                                            <VitalsCard key={i} title={k.toUpperCase()} value={v} />
                                        ))}
                                    </div>
                                )}

                                {/* Labs */}
                                {tabIndex === 1 && (
                                    <div className="p-2 space-y-2 text-[11px]">
                                        {Object.entries(selectedPatient.labs).map(([k, v], i) => (
                                            <div key={i} className="p-2 rounded-lg bg-white/30 backdrop-blur-sm shadow-sm">
                                                <div className="font-medium">{k.charAt(0).toUpperCase() + k.slice(1)}</div>
                                                <div className="font-semibold mt-1">{v} {v !== "-" ? "mg/dL" : ""}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Medications */}
                                {tabIndex === 2 && (
                                    <div className="p-2 flex flex-col gap-2">
                                        {selectedPatient.medications.length === 0 ? (
                                            <div className="text-gray-400 text-[11px]">No medications</div>
                                        ) : (
                                            selectedPatient.medications.map((m, i) => (
                                                <div key={i} className="p-2 rounded-lg bg-white/30 backdrop-blur-sm shadow-sm text-[11px]">
                                                    <div className="font-medium">{m}</div>
                                                    <div className="text-[10px] text-gray-400">As prescribed</div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Dialog open={openMRI} onClose={handleCloseMRI} fullWidth maxWidth="sm">
                <DialogTitle>MRI Results</DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ display: "flex", justifyContent: "center" }}>
                        <Image
                            src={mriImage}
                            alt="MRI"
                            style={{ borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                            width={400}
                            height={300}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseMRI}>Close</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openXRay} onClose={handleCloseXRay} fullWidth maxWidth="sm">
                <DialogTitle>X-Ray Details</DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ display: "flex", justifyContent: "center" }}>
                        <Image
                            src={xrayImage}
                            alt="X-Ray"
                            style={{ borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                            width={400}
                            height={300}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseXRay}>Close</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openEditSummary} onClose={() => setOpenEditSummary(false)} fullWidth maxWidth="sm">
                <DialogTitle>Edit Summary</DialogTitle>
                <DialogContent dividers className="space-y-3">
                    {editableReport ? (
                        <div className="space-y-2 text-[13px]">

                            {/* Basic Info */}
                            <div>
                                <strong>Patient ID:</strong>
                                <input
                                    type="text"
                                    value={editableReport.patient_id || ""}
                                    onChange={(e) =>
                                        setEditableReport(prev => ({ ...prev, patient_id: e.target.value }))
                                    }
                                    className="w-full border p-1 rounded"
                                />
                            </div>

                            <div>
                                <strong>Doctor Name:</strong>
                                <input
                                    type="text"
                                    value={editableReport.doctor_name || ""}
                                    onChange={(e) =>
                                        setEditableReport(prev => ({ ...prev, doctor_name: e.target.value }))
                                    }
                                    className="w-full border p-1 rounded"
                                />
                            </div>

                            <div>
                                <strong>Date / Time:</strong>
                                <input
                                    type="text"
                                    value={
                                        editableReport.timestamp
                                            ? new Date(editableReport.timestamp).toLocaleString()
                                            : ""
                                    }
                                    disabled
                                    className="w-full border p-1 rounded bg-gray-50"
                                />
                            </div>

                            {/* Chief Complaint */}
                            <div>
                                <strong>Chief Complaint:</strong>
                                <textarea
                                    value={editableReport.chief_complaint || ""}
                                    onChange={(e) =>
                                        setEditableReport(prev => ({
                                            ...prev,
                                            chief_complaint: e.target.value
                                        }))
                                    }
                                    className="w-full border p-1 rounded"
                                />
                            </div>

                            {/* Symptoms */}
                            <div>
                                <strong>Symptoms:</strong>
                                <textarea
                                    value={editableReport.symptoms?.join(", ") || ""}
                                    onChange={(e) =>
                                        setEditableReport(prev => ({
                                            ...prev,
                                            symptoms: e.target.value.split(",").map(s => s.trim())
                                        }))
                                    }
                                    placeholder="Comma separated (e.g., continuous pain, swelling)"
                                    className="w-full border p-1 rounded"
                                />
                            </div>

                            {/* Diagnosis */}
                            <div>
                                <strong>Diagnosis:</strong>
                                <textarea
                                    value={editableReport.diagnosis || ""}
                                    onChange={(e) =>
                                        setEditableReport(prev => ({
                                            ...prev,
                                            diagnosis: e.target.value
                                        }))
                                    }
                                    className="w-full border p-1 rounded"
                                />
                            </div>

                            {/* Medications */}
                            <div>
                                <strong>Medications:</strong>
                                <textarea
                                    value={
                                        editableReport.medications?.length
                                            ? editableReport.medications.join(", ")
                                            : ""
                                    }
                                    onChange={(e) =>
                                        setEditableReport(prev => ({
                                            ...prev,
                                            medications: e.target.value
                                                .split(",")
                                                .map(m => m.trim())
                                                .filter(Boolean)
                                        }))
                                    }
                                    placeholder="Comma separated list"
                                    className="w-full border p-1 rounded"
                                />
                            </div>

                            {/* Advice */}
                            <div>
                                <strong>Advice:</strong>
                                <textarea
                                    value={editableReport.advice || ""}
                                    onChange={(e) =>
                                        setEditableReport(prev => ({
                                            ...prev,
                                            advice: e.target.value
                                        }))
                                    }
                                    className="w-full border p-1 rounded"
                                />
                            </div>

                            {/* Follow Up */}
                            <div>
                                <strong>Follow Up:</strong>
                                <textarea
                                    value={editableReport.follow_up || ""}
                                    onChange={(e) =>
                                        setEditableReport(prev => ({
                                            ...prev,
                                            follow_up: e.target.value
                                        }))
                                    }
                                    className="w-full border p-1 rounded"
                                />
                            </div>

                        </div>
                    ) : (
                        <p className="text-gray-500 text-center">
                            No report data available.
                        </p>
                    )}
                </DialogContent>

                <DialogActions>
                    <Button onClick={() => setOpenEditSummary(false)}>Close</Button>
                    <Button
                        variant="contained"
                        onClick={handleSaveReport}
                    >
                        Save
                    </Button>

                </DialogActions>
            </Dialog>

            <Snackbar
                open={alertOpen}
                autoHideDuration={3000}
                onClose={() => setAlertOpen(false)}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert
                    onClose={() => setAlertOpen(false)}
                    severity="warning"
                    sx={{ width: "100%" }}
                >
                    ⚠️ No summary report available to download.
                </Alert>
            </Snackbar>

        </div>
    );
}
