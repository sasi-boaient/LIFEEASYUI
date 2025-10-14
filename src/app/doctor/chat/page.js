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

    const handleCloseMRI = () => setOpenMRI(false);

    const handleCloseXRay = () => setOpenXRay(false);

    const [isTyping, setIsTyping] = useState(false);

    // Reference to hidden file input
    const fileInputRef = useRef(null);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file || selectedPatient.id === 0) return;

        // Add typing message
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
        formData.append("audio", file);

        try {
            const response = await fetch("YOUR_API_URL_HERE", {
                method: "POST",
                body: formData,
            });
            const data = await response.json(); // API returns { translatedText: "..." }

            // Remove typing message
            selectedPatient.messages = selectedPatient.messages.filter(m => !m.typing);

            // Add translated text
            selectedPatient.messages.push({
                sender: "chatagent",
                text: data.translatedText || "No translation available",
                time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                date: new Date().toISOString().split("T")[0],
            });

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
        }
    };

    const handleUploadClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click(); // open file picker
        }
    };

    const [mediaRecorder, setMediaRecorder] = useState(null);

    const handleMicClick = () => {
        if (!isRecording) {
            // Start recording
            setIsRecording(true);

            // Add "Translating..." message immediately
            const typingMessage = {
                sender: "chatagent",
                text: "Translating...",
                time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                date: new Date().toISOString().split("T")[0],
                typing: true
            };
            selectedPatient.messages.push(typingMessage);
            setPatients([...patients]);

            // Simulate backend translation after 3 seconds
            setTimeout(() => {
                // Remove typing message
                selectedPatient.messages = selectedPatient.messages.filter(m => !m.typing);

                // Add failed message
                selectedPatient.messages.push({
                    sender: "chatagent",
                    text: "Failed to translate audio.",
                    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                    date: new Date().toISOString().split("T")[0],
                });
                setPatients([...patients]);
                setIsRecording(false);
            }, 3000);
        } else {
            // Stop recording early if needed
            setIsRecording(false);
            // You could optionally remove "Translating..." immediately on stop
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
                                <div className="font-semibold text-md text-blue-600">LifeEase Hospital</div>
                                <div className="text-[12px] text-gray-400">Doctor Assistant AI</div>
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
                                return (
                                    <div key={i} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                                        <motion.div
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            whileHover={{ scale: 1.01 }}
                                            className={`rounded-xl px-3 py-2 font-semibold max-w-[70%] max-h-32 overflow-y-auto ${isMe ? "bg-blue-200 text-gray-600" : "bg-gray-100 text-gray-800"}`}
                                        >
                                            {!isMe && (
                                                <div className="flex items-center gap-1 mb-1 text-[11px] text-blue-500">
                                                    <span role="img">🤖</span> LifeEase Agent · {m.time}
                                                </div>
                                            )}
                                            <div className="text-[12px]">{m.text}</div>
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
                        <div className="flex items-center gap-2 px-8 py-2 flex-wrap flex-none">
                            <Button
                                startIcon={<MdMedicalServices size={14} />}
                                disableElevation
                                sx={{
                                    minWidth: "auto", padding: "4px 12px", fontSize: "13px", borderRadius: "9999px",
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
                                    minWidth: "auto", padding: "4px 12px", fontSize: "13px", borderRadius: "9999px",
                                    textTransform: "none", backgroundColor: "#f3f3f3",
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
                                    minWidth: "auto", padding: "4px 12px", fontSize: "13px", borderRadius: "9999px",
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
                                    minWidth: "auto", padding: "4px 12px", fontSize: "13px", borderRadius: "9999px",
                                    textTransform: "none", backgroundColor: "#f3f3f3",
                                    color: "#4B5563", "&:hover": { backgroundColor: "#e5e5e5" },
                                }}
                                variant="contained"
                                onClick={() => {
                                    console.log("Edit button clicked!");
                                }}
                            >
                                Edit
                            </Button>

                            <Button startIcon={<FaMicrophone size={14} />} disableElevation variant="contained"
                                sx={{
                                    minWidth: "auto", padding: "4px 12px", fontSize: "13px", borderRadius: "9999px",
                                    textTransform: "none", backgroundColor: isRecording ? "#EF4444" : "#f3f3f3",
                                    color: isRecording ? "#fff" : "#4B5563", "&:hover": { backgroundColor: isRecording ? "#DC2626" : "#e5e5e5" },
                                }}
                                // onClick={() => setIsRecording(!isRecording)}
                                onClick={handleMicClick}
                            >
                                {isRecording ? "Recording..." : "Record"}
                            </Button>

                            <Button startIcon={<FaTimes size={14} />} disableElevation variant="contained"
                                sx={{
                                    minWidth: "auto", padding: "4px 12px", fontSize: "13px", borderRadius: "9999px",
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

        </div>
    );
}
