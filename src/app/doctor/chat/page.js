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
    Box
} from "@mui/material";
import {
    Search as SearchIcon,
    MoreVert,
    Send,
    ArrowBackIosNew
} from "@mui/icons-material";
import { motion } from "framer-motion";
import { FaUser, FaCog, FaSignOutAlt, FaMicrophone, FaXRay, FaEdit, FaTimes, FaUpload } from "react-icons/fa";
import { MdMedicalServices } from "react-icons/md";
import { SiTicktick } from "react-icons/si";
// import profilePic from "../../../../public/assets/doctor.png";
// import logo from "../../../../public/assets/logo.jpg";
import Image from "next/image";
// import mriImage from "../../../../public/assets/MRI.png";
// import xrayImage from "../../../../public/assets/Xray.png";
import { sampleData } from "./SampleData";

const profilePic = "/assets/doctor.png";
const logo = "/assets/logo.jpg";
const mriImage = "/assets/MRI.png";
const xrayImage = "/assets/Xray.png";

// Default patient for empty state
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

/* ---------- Main Component ---------- */
export default function DoctorChatDashboard() {
    const [selectedPatientId, setSelectedPatientId] = useState(sampleData.patients[0]?.id || null);
    const [search, setSearch] = useState("");
    const [tabIndex, setTabIndex] = useState(0);
    const [anchorEl, setAnchorEl] = useState(null);
    const [messageText, setMessageText] = useState("");
    const [patients, setPatients] = useState(sampleData.patients);
    const [isRecording, setIsRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [speechRecognition, setSpeechRecognition] = useState(null);

    const [isFocused, setIsFocused] = useState(false);

    // Filter only active patients
    const activePatients = patients.filter((p) => p.status === "Active");

    // Safe selected patient
    const selectedPatient = useMemo(
        () => activePatients.find((p) => p.id === selectedPatientId) || defaultPatient,
        [activePatients, selectedPatientId]
    );

    // Handle Close button → mark patient as inactive
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

    const onSendMessage = () => {
        if (!messageText.trim() || selectedPatient.id === 0) return;

        // Add your message
        const newMessage = {
            sender: "You",
            text: messageText.trim(),
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            date: new Date().toISOString().split("T")[0],
        };

        // Default bot reply
        const botReply = {
            sender: "chatagent",
            text: "Hello Doctor, I am LifeEase Agent. How can I assist you further?",
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            date: new Date().toISOString().split("T")[0],
        };

        // Update messages
        selectedPatient.messages.push(newMessage, botReply);

        // Clear input
        setMessageText("");
        setSearch((s) => s + ""); // Trigger re-render
    };

    const [openMRI, setOpenMRI] = useState(false);
    const [openXRay, setOpenXRay] = useState(false);
    const [openEditSummary, setOpenEditSummary] = useState(false);
    const [editableReport, setEditableReport] = useState(null);

    const handleOpenEditSummary = () => {
        console.log("edit Clicked.....");
        if (selectedPatient && selectedPatient?.messages?.length > 0) {
            // Get latest report
            const lastReportMessage = [...selectedPatient.messages].reverse().find(m => m.report);
            if (lastReportMessage) {
                setEditableReport({ ...lastReportMessage.report });
            } else {
                // No report found
                setEditableReport(null);
            }
        } else {
            // No patient selected
            setEditableReport(null);
        }
        setOpenEditSummary(true);
    };


    const handleCloseMRI = () => setOpenMRI(false);

    const handleCloseXRay = () => setOpenXRay(false);

    const handleCloseEditSummary = () => setOpenEditSummary(false);

    const [isTyping, setIsTyping] = useState(false);

    const TRANSLATE_AUDIO_API_URL = "https://sttboaient.onrender.com/api/v1/combined/transcribe-and-summarize";

    // Reference to hidden file input
    const fileInputRef = useRef(null);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file || selectedPatient.id === 0) return;

        const typingMessage = {
            sender: "chatagent",
            text: "Translating audio...",
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            date: new Date().toISOString().split("T")[0],
            typing: true
        };

        selectedPatient.messages.push(typingMessage);
        setPatients([...patients]);
        setIsTyping(true);

        const formData = new FormData();
        formData.append("files", file); // must match FastAPI param

        console.log("API URL:", TRANSLATE_AUDIO_API_URL);

        for (let [key, value] of formData.entries()) {
            console.log(`FormData - ${key}:`, value);
        }

        try {
            const response = await fetch(TRANSLATE_AUDIO_API_URL, {
                method: "POST",
                body: formData,
            });
            const data = await response.json();
            // console.log('data', data);
            // Remove typing message
            selectedPatient.messages = selectedPatient.messages.filter(m => !m.typing);

            const firstTranslation = data?.translations?.[0] || null;

            const transcriptionMessage = {
                sender: "chatagent",
                text: firstTranslation?.transcription || "No transcription available.",
                report: firstTranslation?.report || null,  // use null instead of string
                time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                date: new Date().toISOString().split("T")[0],
            };
            // Add the bot's transcription message
            // const transcriptionMessage = {
            //     sender: "chatagent",
            //     text: data.translations?.[0]?.transcription || "No transcription available.",
            //     report: data.translations?.[0]?.report || "No Reports available.",
            //     time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            //     date: new Date().toISOString().split("T")[0],
            // };
            selectedPatient.messages.push(transcriptionMessage);

            setPatients([...patients]);
        } catch (err) {
            console.error(err);
            selectedPatient.messages = selectedPatient.messages.filter(m => !m.typing);
            selectedPatient.messages.push({
                sender: "chatagent",
                text: "Failed to translate audio.",
                time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                date: new Date().toISOString().split("T")[0],
            });
            setPatients([...patients]);
        } finally {
            setIsTyping(false);
            // RESET file input so user can select same file again
            if (fileInputRef.current) {
                fileInputRef.current.value = null;
            }
        }
    };


    const handleUploadClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click(); // open file picker
        }
    };

    const handleMicClick = async () => {
        if (!isRecording) {
            setIsRecording(true);

            // Local transcript for this recording
            let transcript = "";

            // Start speech recognition
            const recognition =
                new (window.SpeechRecognition || window.webkitSpeechRecognition)();
            recognition.lang = "en-US";
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;

            recognition.onresult = (event) => {
                transcript = event.results[0][0].transcript;
                console.log("Transcript:", transcript);
            };

            recognition.onerror = (event) => {
                console.error("Speech recognition error:", event.error);
            };

            recognition.start();

            // Start audio recording
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);

            const chunks = [];
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            recorder.onstop = async () => {
                const audioBlob = new Blob(chunks, { type: "audio/mp3" });
                const audioUrl = URL.createObjectURL(audioBlob);

                // Show user's voice message immediately
                const newMessage = {
                    sender: "You",
                    text: transcript || "Voice message",
                    audio: audioBlob,
                    audioUrl,
                    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                    date: new Date().toISOString().split("T")[0],
                };
                selectedPatient.messages.push(newMessage);
                setPatients([...patients]);

                // Stop all tracks to remove browser recording icon
                stream.getTracks().forEach(track => track.stop());

                // --- Send MP3 to API ---
                const typingMessage = {
                    sender: "chatagent",
                    text: "Translating audio...",
                    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                    date: new Date().toISOString().split("T")[0],
                    typing: true
                };
                selectedPatient.messages.push(typingMessage);
                setPatients([...patients]);

                const formData = new FormData();
                formData.append("files", audioBlob, "voice.mp3");

                try {
                    const response = await fetch(TRANSLATE_AUDIO_API_URL, {
                        method: "POST",
                        body: formData,
                    });
                    const data = await response.json();

                    // Remove typing message
                    selectedPatient.messages = selectedPatient.messages.filter(m => !m.typing);

                    // Add transcription + report
                    const transcriptionMessage = {
                        sender: "chatagent",
                        text: data.translations?.[0]?.transcription || "No transcription available.",
                        report: data.translations?.[0]?.report || "No Reports available.",
                        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                        date: new Date().toISOString().split("T")[0],
                    };
                    selectedPatient.messages.push(transcriptionMessage);
                    setPatients([...patients]);

                } catch (err) {
                    console.error(err);
                    selectedPatient.messages = selectedPatient.messages.filter(m => !m.typing);
                    selectedPatient.messages.push({
                        sender: "chatagent",
                        text: "Failed to translate audio.",
                        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                        date: new Date().toISOString().split("T")[0],
                    });
                    setPatients([...patients]);
                } finally {
                    setIsRecording(false);
                }
            };

            recorder.start();

            // Save references to stop later
            setMediaRecorder(recorder);
            setSpeechRecognition(recognition);

        } else {
            // Stop recording
            if (speechRecognition) speechRecognition.stop();
            if (mediaRecorder) mediaRecorder.stop();
            setIsRecording(false);
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
                                                <p>{m.text}</p>
                                                {m.audioUrl && (
                                                    <audio controls src={m.audioUrl} className="mt-1 w-full rounded-md" />
                                                )}

                                                {/* Render report if available */}
                                                {hasReport && (
                                                    <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 text-gray-700 space-y-2 text-[12px]">
                                                        <h4 className="font-bold text-gray-800 border-b pb-1 mb-2">Summary Report</h4>

                                                        <div>
                                                            <strong>Doctor:</strong> {hasReport.doctor_details.name} ({hasReport.doctor_details.specialization})
                                                        </div>
                                                        <div>
                                                            <strong>Patient:</strong> {hasReport.patient_details.name || "N/A"}
                                                        </div>

                                                        <div className="mt-2">
                                                            <strong>Chief Complaint:</strong> {hasReport.consultation_summary.chief_complaint}
                                                        </div>
                                                        <div>
                                                            <strong>History Of Present Illness:</strong> {hasReport.consultation_summary.history_of_present_illness}
                                                        </div>
                                                        <div>
                                                            <strong>Past Medical History:</strong> {hasReport.consultation_summary.past_medical_history}
                                                        </div>
                                                        <div>
                                                            <strong>Examination Findings:</strong> {hasReport.consultation_summary.examination_findings}
                                                        </div>
                                                        <div>
                                                            <strong>Investigations:</strong> {hasReport.consultation_summary.investigations_or_tests}
                                                        </div>

                                                        <div className="mt-2">
                                                            <strong>Prescription:</strong>
                                                            <ul className="list-disc list-inside ml-2">
                                                                {hasReport.prescription.map((med, idx) => (
                                                                    <li key={idx}>
                                                                        {med.medicine_name || "-"} | Notes: {med.notes || "-"}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>

                                                        <div className="mt-2">
                                                            <strong>Doctor Advice / Plan:</strong> {hasReport.doctor_advice_plan}
                                                        </div>

                                                        <div>
                                                            <strong>Follow-up:</strong> {hasReport.follow_up.mode || "N/A"}
                                                        </div>

                                                        <div>
                                                            <strong>Additional Notes:</strong> {hasReport.additional_notes}
                                                        </div>
                                                    </div>
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

                            <input
                                type="file"
                                ref={fileInputRef}
                                accept="audio/*"
                                style={{ display: "none" }}
                                onChange={handleFileChange}
                            />

                            <Button
                                startIcon={<FaUpload size={14} />}
                                disableElevation
                                sx={{
                                    minWidth: "auto", padding: "4px 12px", fontSize: "12px", borderRadius: "9999px",
                                    textTransform: "none", backgroundColor: "#f3f3f3",
                                    color: "#4B5563", "&:hover": { backgroundColor: "#e5e5e5" },
                                }}
                                variant="contained"
                                onClick={() => {
                                    handleUploadClick();
                                }}
                            >
                                Upload
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
                                // onClick={() => {
                                //     console.log("Edit button clicked!");
                                //     setOpenEditSummary(true);
                                // }}
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
                                // onClick={() => setIsRecording(!isRecording)}
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
                                onClick={() => {
                                    console.log("Updated Report:", editableReport);
                                }}
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
                            {/* Doctor Details */}
                            <div>
                                <strong>Doctor Name:</strong>
                                <input
                                    type="text"
                                    value={editableReport.doctor_details.name}
                                    onChange={(e) =>
                                        setEditableReport(prev => ({
                                            ...prev,
                                            doctor_details: { ...prev.doctor_details, name: e.target.value }
                                        }))
                                    }
                                    className="w-full border p-1 rounded"
                                />
                            </div>
                            <div>
                                <strong>Specialization:</strong>
                                <input
                                    type="text"
                                    value={editableReport.doctor_details.specialization}
                                    onChange={(e) =>
                                        setEditableReport(prev => ({
                                            ...prev,
                                            doctor_details: { ...prev.doctor_details, specialization: e.target.value }
                                        }))
                                    }
                                    className="w-full border p-1 rounded"
                                />
                            </div>

                            {/* Patient Details */}
                            <div>
                                <strong>Patient Name:</strong>
                                <input
                                    type="text"
                                    value={editableReport.patient_details.name || ""}
                                    onChange={(e) =>
                                        setEditableReport(prev => ({
                                            ...prev,
                                            patient_details: { ...prev.patient_details, name: e.target.value }
                                        }))
                                    }
                                    className="w-full border p-1 rounded"
                                />
                            </div>
                            <div>
                                <strong>Patient ID:</strong>
                                <input
                                    type="text"
                                    value={editableReport.patient_details.id || ""}
                                    onChange={(e) =>
                                        setEditableReport(prev => ({
                                            ...prev,
                                            patient_details: { ...prev.patient_details, id: e.target.value }
                                        }))
                                    }
                                    className="w-full border p-1 rounded"
                                />
                            </div>
                            <div>
                                <strong>Age/Gender:</strong>
                                <input
                                    type="text"
                                    value={editableReport.patient_details.age_gender || ""}
                                    onChange={(e) =>
                                        setEditableReport(prev => ({
                                            ...prev,
                                            patient_details: { ...prev.patient_details, age_gender: e.target.value }
                                        }))
                                    }
                                    className="w-full border p-1 rounded"
                                />
                            </div>

                            {/* Consultation Summary */}
                            <div>
                                <strong>Chief Complaint:</strong>
                                <textarea
                                    value={editableReport.consultation_summary.chief_complaint}
                                    onChange={(e) =>
                                        setEditableReport(prev => ({
                                            ...prev,
                                            consultation_summary: { ...prev.consultation_summary, chief_complaint: e.target.value }
                                        }))
                                    }
                                    className="w-full border p-1 rounded"
                                />
                            </div>
                            <div>
                                <strong>History of Present Illness:</strong>
                                <textarea
                                    value={editableReport.consultation_summary.history_of_present_illness}
                                    onChange={(e) =>
                                        setEditableReport(prev => ({
                                            ...prev,
                                            consultation_summary: { ...prev.consultation_summary, history_of_present_illness: e.target.value }
                                        }))
                                    }
                                    className="w-full border p-1 rounded"
                                />
                            </div>
                            <div>
                                <strong>Past Medical History:</strong>
                                <textarea
                                    value={editableReport.consultation_summary.past_medical_history}
                                    onChange={(e) =>
                                        setEditableReport(prev => ({
                                            ...prev,
                                            consultation_summary: { ...prev.consultation_summary, past_medical_history: e.target.value }
                                        }))
                                    }
                                    className="w-full border p-1 rounded"
                                />
                            </div>
                            <div>
                                <strong>Examination Findings:</strong>
                                <textarea
                                    value={editableReport.consultation_summary.examination_findings}
                                    onChange={(e) =>
                                        setEditableReport(prev => ({
                                            ...prev,
                                            consultation_summary: { ...prev.consultation_summary, examination_findings: e.target.value }
                                        }))
                                    }
                                    className="w-full border p-1 rounded"
                                />
                            </div>
                            <div>
                                <strong>Investigations / Tests:</strong>
                                <textarea
                                    value={editableReport.consultation_summary.investigations_or_tests}
                                    onChange={(e) =>
                                        setEditableReport(prev => ({
                                            ...prev,
                                            consultation_summary: { ...prev.consultation_summary, investigations_or_tests: e.target.value }
                                        }))
                                    }
                                    className="w-full border p-1 rounded"
                                />
                            </div>

                            {/* Doctor Advice */}
                            <div>
                                <strong>Doctor Advice / Plan:</strong>
                                <textarea
                                    value={editableReport.doctor_advice_plan}
                                    onChange={(e) =>
                                        setEditableReport(prev => ({ ...prev, doctor_advice_plan: e.target.value }))
                                    }
                                    className="w-full border p-1 rounded"
                                />
                            </div>

                            {/* Follow-up */}
                            <div>
                                <strong>Follow-up Mode:</strong>
                                <input
                                    type="text"
                                    value={editableReport.follow_up.mode || ""}
                                    onChange={(e) =>
                                        setEditableReport(prev => ({
                                            ...prev,
                                            follow_up: { ...prev.follow_up, mode: e.target.value }
                                        }))
                                    }
                                    className="w-full border p-1 rounded"
                                />
                                <strong>Next Visit:</strong>
                                <input
                                    type="text"
                                    value={editableReport.follow_up.next_visit || ""}
                                    onChange={(e) =>
                                        setEditableReport(prev => ({
                                            ...prev,
                                            follow_up: { ...prev.follow_up, next_visit: e.target.value }
                                        }))
                                    }
                                    className="w-full border p-1 rounded"
                                />
                            </div>

                            {/* Additional Notes */}
                            <div>
                                <strong>Additional Notes:</strong>
                                <textarea
                                    value={editableReport.additional_notes}
                                    onChange={(e) => setEditableReport(prev => ({ ...prev, additional_notes: e.target.value }))}
                                    className="w-full border p-1 rounded"
                                />
                            </div>
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center">No report data available.</p>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenEditSummary(false)}>Close</Button>
                    {/* chat will grow naturally if we edit 10 times then 10 chat */}
                    {/* <Button
                        variant="contained"
                        onClick={() => {
                            if (!editableReport) return;

                            // Push a new chat message from "You" with the updated report
                            const newMessage = {
                                sender: "You",
                                text: "Edited Report", // optional: or a short summary
                                report: editableReport,
                                time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                                date: new Date().toISOString().split("T")[0],
                            };

                            selectedPatient.messages.push(newMessage);
                            setPatients([...patients]); // trigger re-render

                            setOpenEditSummary(false);
                        }}
                    >
                        Save
                    </Button> */}

                    <Button
                        variant="contained"
                        onClick={() => {
                            if (!editableReport) return;

                            // Remove previous edited report messages sent by "You"
                            selectedPatient.messages = selectedPatient.messages.filter(
                                m => !(m.sender === "You" && m.report)
                            );

                            // Push the new edited report as a message
                            const newMessage = {
                                sender: "You",
                                text: "Edited Report", // or summary if you want
                                report: editableReport,
                                time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                                date: new Date().toISOString().split("T")[0],
                            };

                            selectedPatient.messages.push(newMessage);
                            setPatients([...patients]); // trigger re-render

                            setOpenEditSummary(false);
                        }}
                    >
                        Save
                    </Button>

                </DialogActions>
            </Dialog>

        </div>
    );
}
