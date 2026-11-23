# 🚦 Smart Traffic Signal Controller — Operating Systems Case Study

> An Operating Systems case study that models a **Smart Traffic Signal Controller** using OS scheduling concepts such as process scheduling, priority management, starvation prevention, and interrupt handling.

---

## 📄 Overview

This project presents a detailed case study analyzing a **Smart Traffic Signal Controller** from an Operating Systems perspective. The system manages traffic requests from four roads, including normal vehicles, emergency vehicles (ambulances, fire engines, police vehicles), and pedestrian crossing requests.

Traffic requests are modeled as **processes**, and core OS concepts — such as **process scheduling**, **priority scheduling**, **real-time scheduling**, **interrupts**, **starvation**, and **aging** — are applied to design an efficient and fair traffic management system.

---

## 📑 Table of Contents

| S.No. | Topic | Page |
|-------|-------|------|
| 1 | Abstract | 3 |
| 2 | Introduction | 3 |
| 3 | Problem Statement | 3 |
| 4 | Objectives | 4 |
| 5 | System Description | 4 |
| 6 | Mapping of Traffic Components to OS Concepts | 5 |
| 7 | OS Concepts Involved | 6 |
| 8 | System Model / Diagram | 7 |
| 9 | Existing Emergency Vehicle Priority Systems (DAC, EmSerV, FHWA) | 7 |
| 10 | Scheduling Analysis (FCFS, Priority, Round Robin) | 8–11 |
| 11 | Proposed Scheduling Strategy | 11 |
| 12 | Problem Identification — Starvation | 12–14 |
| 13 | Proposed Solution (Priority + Aging + Interrupts + Preemption) | 15–16 |
| 14 | Expected OS Behaviour | 17–19 |
| 15 | Results and Observations | 19–20 |
| 16 | Conclusion | 20 |
| 17 | References and AI-Use Note | 21 |

---

## 🎯 Key Concepts Covered

- **Process Scheduling** — Traffic requests modeled as OS processes
- **FCFS (First-Come, First-Served)** — Baseline scheduling analysis
- **Priority Scheduling** — Emergency vehicles assigned higher priority
- **Round Robin Scheduling** — Fair time-slice-based scheduling
- **Starvation & Aging** — Preventing indefinite waiting for normal traffic
- **Interrupt Handling** — Emergency vehicles triggering preemptive interrupts
- **Preemption** — Temporarily halting current traffic phase for urgent requests
- **Gantt Charts** — Visual comparison of scheduling algorithms
- **Waiting Time & Turnaround Time** — Performance metrics for each algorithm

---

## 🛠️ Problem Statement

The smart traffic controller must **prioritize emergency vehicles** while ensuring that normal traffic is **not ignored indefinitely**. The main challenge is to manage traffic requests efficiently and prevent starvation of lower-priority requests.

---

## 💡 Proposed Solution

A **priority-based scheduling strategy with aging** is proposed:

1. **Priority Scheduling** — Emergency requests receive higher priority
2. **Aging** — Waiting normal requests gradually increase in priority over time
3. **Interrupt Handling** — Emergency vehicles generate interrupts to preempt current traffic phases
4. **Preemption** — The controller can temporarily change execution order for urgent requests

This approach ensures urgent requests are served quickly while normal traffic is never starved.

---

## 👥 Team

| S.No. | Name | USN | Part |
|-------|------|-----|------|
| 1 | Abhinash Das | 25BTRSN001 | P1 |
| 2 | Bhumika S | 25BTRSN007 | P1 |
| 3 | D. Dileep | 25BTRSN013 | P2 |
| 4 | Jeevan R A | 25BTRSN01_ | P2 |
| 5 | Kushal Choudhary | 25BTRSN025 | P3 |
| 6 | Nithish P | 25BTRSN031 | P3 |
| 7 | Raunak Bothra | 25BTRSN037 | P4 |
| 8 | Sarvdeep Singh | 25BTRSN043 | P4 |
| 9 | Thiviyeh J | 25BTRSN04_ | P5 |
| 10 | Yashas L Rao | 25BTRSN055 | P5 |
| 11 | Prashanna Venkadesh | 25BTRCO037 | P5 |

**Submitted to:** Mr. Karthikeyan, Assistant Professor  
**Department:** Computer Science and Engineering  
**Faculty:** Faculty of Engineering and Technology  
**Institution:** JAIN (Deemed-to-be University)  
**Branch/Section:** CSE-SE  
**Date of Submission:** 5th October 2025

---

## 📂 Project Structure

```
.
├── README.md                        # This file
└── os case study report.pdf         # Full 22-page case study report
```

---

## 📚 References

1. Silberschatz, A., Galvin, P. B., & Gagne, G. — *Operating System Concepts*, 10th Edition, Wiley.
2. National Operations Center of Excellence — *Signal Timing Manual*.
3. National Transportation Communications for Intelligent Transportation System Protocol (NTCIP) — *Signal Control and Prioritization (SCP)*.

---

## 📜 License

This project is an academic case study report submitted as part of the Operating Systems coursework at JAIN (Deemed-to-be University). It is intended for educational purposes only.
