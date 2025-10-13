"use client"
import React, { useState, useMemo } from "react";
import {
    AppBar,
    Toolbar,
    IconButton,
    Avatar,
    Badge,
    Box,
    Menu,
    MenuItem,
    Tabs,
    Tab,
    Paper,
    InputBase,
    Chip,
    Divider,
} from "@mui/material";
import {
    Search as SearchIcon,
    MoreVert,
    Mic,
    Send,
    ArrowBackIosNew,
} from "@mui/icons-material";
import { motion } from "framer-motion";
import profilePic from "../../assests/doctor.png";
import logo from "../../assests/logo.jpg";
import { ListItemIcon } from "@mui/material";
import { FaUser, FaCog, FaSignOutAlt } from "react-icons/fa";
import { FaHeartbeat, FaPills, FaMicrophone } from "react-icons/fa";
import { Button } from "@mui/material";
import { FaXRay, FaEdit, FaTimes } from "react-icons/fa";
import { MdMedicalServices } from "react-icons/md";

const sampleData = {
    patients: [
        {
            id: 1,
            name: "Anita Sharma",
            desc: "Diabetics Review",
            scheduletime: "11:30 AM",
            mrn: "MRN001",
            age: 45,
            sex: "F",
            allergy: "Penicillin",
            condition: "Diabetes, Hypertension",
            vitals: { HR: 76, SpO2: "98%", BP: "120/80", Temp: "98.4°F" },
            labs: { glucose: 120, cholesterol: 180 },
            medications: ["Metformin", "Amlodipine"],
            messages: [
                { sender: "John", text: "Good morning Doctor, my blood sugar was 180 mg/dL this morning 😕", time: "08:10 AM", date: "2025-10-13" },
                { sender: "You", text: "Thanks for updating, John. Did you have breakfast before measuring it?", time: "08:12 AM", date: "2025-10-13" },
                { sender: "John", text: "No, I measured it fasting. I also feel a bit thirsty and tired.", time: "08:15 AM", date: "2025-10-13" },
            ],

            previousCheckups: [
                {
                    date: "2025-09-20",
                    vitals: { HR: 78, BP: "118/76", Temp: "98.6°F" },
                    labs: { glucose: 115, cholesterol: 175 },
                    medications: ["Metformin", "Amlodipine"],
                    notes: "Stable condition, advised diet control.",
                    desc: "Routine diabetic checkup.",
                    nextAppointment: "2025-10-20",
                },
                {
                    date: "2025-08-15",
                    vitals: { HR: 80, BP: "122/78", Temp: "98.4°F" },
                    labs: { glucose: 130, cholesterol: 190 },
                    medications: ["Metformin", "Amlodipine"],
                    notes: "Slightly elevated glucose, continue meds.",
                    desc: "Follow-up for elevated glucose levels.",
                    nextAppointment: "2025-09-15",
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
            condition: "Asthma",
            vitals: { HR: 82, SpO2: "95%", BP: "118/78", Temp: "98.9°F" },
            labs: { glucose: 110, cholesterol: 170 },
            medications: ["Salbutamol"],
            messages: [
                { sender: "Emma", text: "I took my meds 💊", time: "10:10 AM", date: "2025-10-09" },
            ],
            previousCheckups: [
                {
                    date: "2025-09-10",
                    vitals: { HR: 80, BP: "120/80", Temp: "98.7°F" },
                    labs: { glucose: 108, cholesterol: 165 },
                    medications: ["Salbutamol"],
                    notes: "Stable, continue current meds.",
                },
                {
                    date: "2025-07-25",
                    vitals: { HR: 85, BP: "122/82", Temp: "98.9°F" },
                    labs: { glucose: 112, cholesterol: 168 },
                    medications: ["Salbutamol"],
                    notes: "Mild asthma flare, advised inhaler use.",
                },
            ],
        },
    ],
};

/* ---------- Helper components ---------- */
const SmallLabel = ({ children }) => (
    <div className="text-xs text-gray-500 uppercase tracking-wide">{children}</div>
);

const VitalsCard = ({ title, value }) => (
    <div className="bg-white rounded-lg shadow-sm p-3 min-w-[120px] flex flex-col items-center">
        <div className="text-xs text-gray-400">{title}</div>
        <div className="font-semibold text-md mt-1">{value}</div>
    </div>
);

/* ---------- Main Component ---------- */
export default function DoctorChatDashboard() {
    const [selectedPatientId, setSelectedPatientId] = useState(sampleData.patients[0].id);
    const [search, setSearch] = useState("");
    const [tabIndex, setTabIndex] = useState(0);
    const [anchorEl, setAnchorEl] = useState(null);
    const [messageText, setMessageText] = useState("");

    const patients = sampleData.patients;
    const selectedPatient = useMemo(
        () => patients.find((p) => p.id === selectedPatientId),
        [patients, selectedPatientId]
    );

    const onSendMessage = () => {
        if (!messageText.trim()) return;
        selectedPatient.messages.push({
            sender: "You",
            text: messageText.trim(),
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            date: new Date().toISOString().split("T")[0],
        });
        setMessageText("");
        setSearch((s) => s + "");
    };

    const [isRecording, setIsRecording] = useState(false);

    const buttons = [
        { icon: <MdMedicalServices size={14} />, label: "MRI" },
        { icon: <FaXRay size={14} />, label: "X-Ray" },
        { icon: <FaHeartbeat size={14} />, label: "Vitals" },
        { icon: <FaPills size={14} />, label: "Medications" },
        { icon: <FaEdit size={14} />, label: "Edit Summary" },
        { icon: <FaTimes size={14} />, label: "Close" },
    ];

    return (
        <div className="h-screen flex flex-col bg-gray-100 text-gray-800 text-sm">
            {/* AppBar - 10% */}
            <div className="h-[10%]">
                <AppBar position="sticky" color="transparent" elevation={0} className="backdrop-blur-sm h-full">
                    <Toolbar className="flex justify-between p-2 h-full">
                        <div className="flex items-center gap-2">
                            <Avatar
                                src={logo.src}
                                sx={{
                                    position: "relative",
                                    // bgcolor: "white",
                                    width: 44,
                                    height: 44,
                                    fontWeight: 600,
                                    // border: "1px solid #9ca3af",
                                    zIndex: 10,
                                    padding: "1px"
                                }}
                            >
                                LE
                            </Avatar>
                            <div>
                                <div className="font-semibold text-sm text-gray-800">LifeEase Hospital</div>
                                <div className="text-[10px] text-gray-400">Doctor Assistant AI</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2">
                                <div className="text-right hidden sm:block">
                                    <div className="font-medium text-[11px]">Dr. John Doe</div>
                                    <div className="text-[10px] text-gray-400">Cardiologist</div>
                                </div>
                                <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="relative"
                                >
                                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-400 opacity-60 blur-sm"></div>
                                    <Avatar
                                        src={profilePic.src}
                                        sx={{
                                            position: "relative",
                                            bgcolor: "#090E6B",
                                            width: 44,
                                            height: 44,
                                            fontWeight: 600,
                                            border: "2px solid white",
                                            zIndex: 10,
                                        }}
                                    >
                                        JD
                                    </Avatar>
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
                                        <ListItemIcon>
                                            <FaUser style={{ color: "#4F46E5", minWidth: 20 }} />
                                        </ListItemIcon>
                                        Profile
                                    </MenuItem>

                                    <MenuItem onClick={() => console.log("Settings clicked")}>
                                        <ListItemIcon>
                                            <FaCog style={{ color: "#F59E0B", minWidth: 20 }} />
                                        </ListItemIcon>
                                        Settings
                                    </MenuItem>

                                    <MenuItem onClick={() => console.log("Logout clicked")}>
                                        <ListItemIcon>
                                            <FaSignOutAlt style={{ color: "#EF4444", minWidth: 20 }} />
                                        </ListItemIcon>
                                        Logout
                                    </MenuItem>
                                </Menu>
                            </div>
                        </div>
                    </Toolbar>
                </AppBar>
            </div>

            {/* Main Grid - 90% */}
            <div className="h-[90%] p-2 grid grid-cols-12 gap-2">
                {/* Left Sidebar */}
                <div className="col-span-12 lg:col-span-3 h-full">
                    <div className="bg-white rounded-xl shadow flex flex-col h-full">
                        {/* Search 10% */}
                        <div className="h-[10%] p-2">
                            <Paper className="p-1 flex items-center h-full" elevation={0}>
                                <IconButton size="small"><SearchIcon fontSize="small" /></IconButton>
                                <InputBase
                                    placeholder="Search..."
                                    fullWidth
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="text-[11px]"
                                />
                            </Paper>
                        </div>

                        {/* Cases 65% */}
                        <div className="h-[55%] flex flex-col overflow-y-auto p-2">
                            <h4 className="text-gray-600 text-xs font-semibold">
                                Appointments
                            </h4>
                            <div className="mt-2 space-y-2">
                                {patients.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || !search)
                                    .map((p) => (
                                        <motion.div
                                            key={p.id}
                                            whileHover={{ scale: 1.01 }}
                                            whileTap={{ scale: 0.99 }}
                                            onClick={() => setSelectedPatientId(p.id)}
                                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer ${p.id === selectedPatientId ? "bg-slate-100" : "bg-gray-50"}`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-black font-bold text-[12px]">
                                                    {p.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-[11px]">{p.name}</div>
                                                    <div className="text-[10px] text-gray-500">{p.desc}</div>
                                                </div>
                                            </div>
                                            <div className="text-[10px] text-gray-500">{p.scheduletime}</div>
                                        </motion.div>
                                    ))}
                            </div>
                        </div>

                        {/* Glassy Separator */}
                        <div className="w-full h-1 my-2 rounded-full bg-white/20 backdrop-blur-sm shadow-sm"></div>

                        {/* Previous History 25% */}
                        <div className="h-[35%] flex flex-col overflow-y-auto p-2">
                            <h4 className="text-gray-600 text-xs font-semibold">
                                Previous History
                            </h4>
                            <div className="mt-2 space-y-2">
                                {selectedPatient.previousCheckups.map((c, idx) => (
                                    <motion.div
                                        key={idx}
                                        className="bg-gradient-to-tr from-white to-slate-50 p-2 rounded-lg shadow-sm"
                                        whileHover={{ x: 4 }}
                                    >
                                        <div className="text-[11px] font-semibold">{c.desc}</div>
                                        <div className="text-[10px] text-gray-500 mt-1">Next Appointment: {c.nextAppointment || "-"}</div>
                                        <div className="flex items-center gap-1 mt-1">
                                            <Chip label={`HR: ${c.vitals.HR} BPM`} size="small" />
                                            <Chip label={`BP: ${c.vitals.BP}`} size="small" />
                                            <Chip label={`Temp: ${c.vitals.Temp}`} size="small" />
                                        </div>
                                        <div className="text-[10px] text-gray-600 mt-1">{c.notes}</div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>

                {/* Center Chat */}
                <div className="col-span-12 lg:col-span-6 h-full">
                    <div className="bg-white rounded-xl shadow flex flex-col h-full">
                        {/* Chat Header */}
                        <div className="border-b px-3 py-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <IconButton size="small" className="hidden lg:block"><ArrowBackIosNew fontSize="small" /></IconButton>
                                <div className="flex items-center gap-2">
                                    <Avatar alt={selectedPatient.name} src={`https://i.pravatar.cc/40?u=${selectedPatient.id}`} sx={{ width: 28, height: 28 }} />
                                    <div>
                                        <div className="font-semibold text-[11px]">{selectedPatient.name}</div>
                                        <div className="text-[10px] text-gray-500">{selectedPatient.desc}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="text-[10px] text-gray-600 font-semibold">{selectedPatient.mrn} · {selectedPatient.age} yrs, {selectedPatient.sex}</div>
                        </div>

                        {/* Chat Messages */}
                        <div className="flex-1 p-3 overflow-auto relative space-y-2">
                            {selectedPatient.messages.map((m, i) => {
                                const isMe = m.sender === "You";
                                return (
                                    <div key={i} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                                        <motion.div
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            whileHover={{ scale: 1.01 }}
                                            className={`rounded-xl px-3 py-2 max-w-[65%] font-semibold ${isMe ? "bg-indigo-200 text-gray-600" : "bg-gray-100 text-gray-800"}`}
                                        >
                                            {!isMe && <div className="flex items-center gap-1 mb-1 text-[10px] text-gray-500"><span role="img">🤖</span> LifeCase · {m.time}</div>}
                                            <div className="text-[11px]">{m.text}</div>
                                            {isMe && <div className="text-[9px] text-gray-300 mt-1 text-right">{m.time}</div>}
                                        </motion.div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Chat Input */}
                        <div className="border-t px-3 py-2 flex items-center gap-2">
                            <input
                                placeholder="Message..."
                                className="flex-1 bg-gray-50 rounded-full px-3 py-2 text-[11px] outline-none"
                                value={messageText}
                                onChange={(e) => setMessageText(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") onSendMessage(); }}
                            />
                            <IconButton size="small" color="primary" onClick={onSendMessage}><Send fontSize="small" /></IconButton>
                        </div>

                        <div className="flex items-center gap-2 px-8 py-2 flex-wrap">
                            {buttons.map((btn, i) => (
                                <Button
                                    key={i}
                                    startIcon={btn.icon}
                                    disableElevation
                                    variant="contained"
                                    sx={{
                                        minWidth: "auto",
                                        padding: "4px 12px",
                                        fontSize: "12px",
                                        borderRadius: "9999px",
                                        textTransform: "none",
                                        backgroundColor: "#f3f3f3",
                                        color: "#4B5563",
                                        "&:hover": {
                                            backgroundColor: "#e5e5e5",
                                        },
                                    }}
                                >
                                    {btn.label}
                                </Button>
                            ))}

                            {/* Record Button */}
                            <Button
                                startIcon={<FaMicrophone size={14} />}
                                disableElevation
                                variant="contained"
                                sx={{
                                    minWidth: "auto",
                                    padding: "4px 12px",
                                    fontSize: "12px",
                                    borderRadius: "9999px",
                                    textTransform: "none",
                                    backgroundColor: isRecording ? "#EF4444" : "#f3f3f3", // red if recording
                                    color: isRecording ? "#fff" : "#4B5563",
                                    "&:hover": {
                                        backgroundColor: isRecording ? "#DC2626" : "#e5e5e5",
                                    },
                                }}
                                onClick={() => setIsRecording(!isRecording)}
                            >
                                {isRecording ? "Recording..." : "Record"}
                            </Button>
                        </div>

                    </div>
                </div>

                {/* Right Panel */}
                <div className="col-span-12 lg:col-span-3 h-full">
                    <div className="bg-white rounded-xl shadow p-3 flex flex-col h-full overflow-y-auto">
                        <div className="p-3 rounded-xl bg-white/20 backdrop-blur-md shadow-lg space-y-3">
                            {/* Patient Info */}
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="font-semibold text-[12px]">{selectedPatient.name}</div>
                                    <div className="text-[10px] text-gray-400">{selectedPatient.mrn}</div>
                                </div>
                                <div className="text-[10px] text-gray-400 text-right">
                                    {selectedPatient.age} yrs, {selectedPatient.sex}
                                </div>
                            </div>

                            {/* Allergies */}
                            <div>
                                <SmallLabel>Allergies</SmallLabel>
                                <div className="mt-1">
                                    <Chip label={selectedPatient.allergy} size="small" />
                                </div>
                            </div>

                            {/* Conditions */}
                            <div>
                                <SmallLabel>Conditions</SmallLabel>
                                <div className="mt-1 flex gap-1">
                                    {selectedPatient.condition.split(",").map((c, i) => (
                                        <Chip key={i} label={c.trim()} size="small" />
                                    ))}
                                </div>
                            </div>
                        </div>


                        {/* Glossy Card */}
                        <div className="mt-2 p-3 rounded-xl bg-white/20 backdrop-blur-md shadow-lg">
                            {/* Tabs Header */}
                            <div className="flex border-b border-gray-300">
                                {["Vitals", "Labs", "Medications"].map((label, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setTabIndex(idx)}
                                        className={`
                                                    flex-1 text-[11px] font-semibold py-2
                                                    ${tabIndex === idx ? "border-b-2 border-gray-500 text-gray-900" : "text-gray-500"}
                                                    text-center
                                                    `}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>

                            {/* Tabs Content */}
                            <div className="mt-3 space-y-3">
                                {/* Vitals */}
                                {tabIndex === 0 && (
                                    <div className="grid grid-cols-2 gap-2">
                                        <VitalsCard title="HR" value={selectedPatient.vitals.HR} glossy />
                                        <VitalsCard title="SPO2" value={selectedPatient.vitals.SpO2} glossy />
                                        <VitalsCard title="BP" value={selectedPatient.vitals.BP} glossy />
                                        <VitalsCard title="TEMP" value={selectedPatient.vitals.Temp} glossy />
                                    </div>
                                )}

                                {/* Labs */}
                                {tabIndex === 1 && (
                                    <div className="p-2 space-y-2 text-[11px]">
                                        <div className="p-2 rounded-lg bg-white/30 backdrop-blur-sm shadow-sm">
                                            <div className="font-medium">Glucose</div>
                                            <div className="font-semibold mt-1">{selectedPatient.labs.glucose} mg/dL</div>
                                        </div>
                                        <div className="p-2 rounded-lg bg-white/30 backdrop-blur-sm shadow-sm">
                                            <div className="font-medium">Cholesterol</div>
                                            <div className="font-semibold mt-1">{selectedPatient.labs.cholesterol} mg/dL</div>
                                        </div>
                                    </div>
                                )}

                                {/* Medications */}
                                {tabIndex === 2 && (
                                    <div className="p-2 flex flex-col gap-2">
                                        {selectedPatient.medications.map((m, i) => (
                                            <div
                                                key={i}
                                                className="p-2 rounded-lg bg-white/30 backdrop-blur-sm shadow-sm text-[11px]"
                                            >
                                                <div className="font-medium">{m}</div>
                                                <div className="text-[10px] text-gray-400">As prescribed</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
