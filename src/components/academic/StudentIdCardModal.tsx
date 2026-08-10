import React, { useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Printer,
  Download,
  School,
  CheckCircle2,
  Layers,
  Eye,
  RotateCw,
  FileText,
  Image,
  Sparkles,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";
import { IdCardRenderer } from "./IdCardRenderer";
import { RDCEleveCardTemplate } from "./RDCEleveCardTemplate";
import { Eleve } from "../../types";
import { useSchoolConfig } from "../../hooks/useSchoolConfig";

interface StudentIdCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Eleve;
}

export const StudentIdCardModal: React.FC<StudentIdCardModalProps> = ({
  isOpen,
  onClose,
  student,
}) => {
  const { config } = useSchoolConfig();
  const [cardModel, setCardModel] = useState<"rdc_epst" | "custom">("rdc_epst");
  const [activeTab, setActiveTab] = useState<"inner" | "outer" | "unfolded">(
    "unfolded",
  );
  const [zoomScale, setZoomScale] = useState<number>(1.0);

  if (!isOpen) return null;

  const handleZoomIn = () =>
    setZoomScale((prev) =>
      Math.min(2.2, Math.round((prev + 0.15) * 100) / 100),
    );
  const handleZoomOut = () =>
    setZoomScale((prev) =>
      Math.max(0.6, Math.round((prev - 0.15) * 100) / 100),
    );
  const handleResetZoom = () => setZoomScale(1.0);

  const fileNameBase =
    `Carte_${student.registrationNumber || student.id}_${student.prenom}_${student.nom}`
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_-]/g, "");

  const handlePrint = () => window.print();

  const getPrintElement = () => document.getElementById("card-print-section");

  const captureCleanCanvas = async (element: HTMLElement) => {
    const html2canvasModule = await import("html2canvas").catch(() => null);
    if (!html2canvasModule) return null;
    const html2canvas = (html2canvasModule as any).default || html2canvasModule;

    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.left = "-9999px";
    container.style.top = "-9999px";
    container.style.width = "auto";
    container.style.height = "auto";
    container.style.background = "#F0F4F8";

    const clone = element.cloneNode(true) as HTMLElement;
    const innerScales = clone.querySelectorAll<HTMLElement>("[style*='transform']");
    innerScales.forEach((el) => {
      el.style.transform = "none";
    });
    clone.style.transform = "none";

    container.appendChild(clone);
    document.body.appendChild(container);

    const canvas = await html2canvas(clone, {
      scale: 3,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#F0F4F8",
      logging: false,
    });

    document.body.removeChild(container);
    return canvas;
  };

  const handleDownloadPDF = async () => {
    const element = getPrintElement();
    if (!element) return;
    try {
      const canvas = await captureCleanCanvas(element);
      if (!canvas) return;

      const jsPDFModule = await import("jspdf").catch(() => null);
      if (!jsPDFModule) return;
      const { jsPDF } = jsPDFModule as any;
      const pdf = new jsPDF("p", "mm", "a4");

      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      const imgWidth = 190;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 10;

      pdf.addImage(imgData, "JPEG", 10, position, imgWidth, imgHeight);
      pdf.save(`${fileNameBase}.pdf`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownloadPNG = async () => {
    const element = getPrintElement();
    if (!element) return;
    try {
      const canvas = await captureCleanCanvas(element);
      if (!canvas) return;
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png", 1.0);
      a.download = `${fileNameBase}.png`;
      a.click();
    } catch (e) {
      console.error(e);
    }
  };

  const modalJSX = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in overflow-y-auto">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #card-print-section, #card-print-section * { visibility: visible !important; }
          #card-print-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            display: flex;
            align-items: flex-start;
            justify-content: center;
            gap: 16px;
            padding: 16px;
            background: white !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div
        className="relative w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] border"
        style={{
          background: "var(--bg-surface)",
          borderColor: "var(--border)",
        }}
      >
        {/* EN-TÊTE */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between no-print"
          style={{
            background: "var(--bg-sunken)",
            borderColor: "var(--border)",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600/20 text-indigo-500 border border-indigo-500/30">
              <School className="w-5 h-5" />
            </div>
            <div>
              <h2
                className="text-sm font-black uppercase tracking-wider flex items-center gap-2"
                style={{ color: "var(--text-primary)" }}
              >
                Carte Officielle EPST RDC (85.6mm × 54mm)
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-extrabold">
                  Norme RDC EPST
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Format carte de crédit standard · Fond bleu très clair #F0F4F8 ·
                Export PDF/PNG
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-500/10 text-slate-500 dark:text-slate-300 hover:bg-red-500 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BARRE D'ACTIONS ET SÉLECTEUR DE MODÈLE */}
        <div
          className="px-6 py-3 border-b flex flex-wrap items-center justify-between gap-3 no-print"
          style={{
            background: "var(--bg-sunken)",
            borderColor: "var(--border)",
          }}
        >
          {/* Sélecteur de Modèle de Carte */}
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-1 p-1 rounded-2xl border bg-slate-100 dark:bg-slate-900"
              style={{ borderColor: "var(--border)" }}
            >
              <button
                onClick={() => setCardModel("rdc_epst")}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  cardModel === "rdc_epst"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" /> Modèle Officiel RDC (85.6 ×
                54mm)
              </button>
              <button
                onClick={() => setCardModel("custom")}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  cardModel === "custom"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Layers className="w-3.5 h-3.5" /> Modèle Personnalisé
              </button>
            </div>

            {/* Toggle Recto / Verso */}
            <div
              className="flex items-center gap-1 p-1 rounded-2xl border"
              style={{
                background: "var(--bg-sunken)",
                borderColor: "var(--border)",
              }}
            >
              {[
                { id: "inner", icon: Eye, label: "Recto" },
                { id: "outer", icon: RotateCw, label: "Verso" },
                { id: "unfolded", icon: Layers, label: "Les deux" },
              ].map((t: any) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === t.id
                      ? "bg-slate-800 text-white shadow-xs"
                      : "hover:bg-slate-500/10"
                  }`}
                  style={{
                    color:
                      activeTab === t.id ? "#ffffff" : "var(--text-secondary)",
                  }}
                >
                  <t.icon className="w-3.5 h-3.5" /> {t.label}
                </button>
              ))}
            </div>

            {/* Control Zoom */}
            <div
              className="flex items-center gap-1 p-1 rounded-2xl border"
              style={{
                background: "var(--bg-sunken)",
                borderColor: "var(--border)",
              }}
            >
              <button
                onClick={handleZoomOut}
                className="p-1.5 rounded-xl hover:bg-slate-500/10 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                title="Zoomer Arrière (-)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleResetZoom}
                className="px-2 py-1 rounded-lg text-[11px] font-mono font-black text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 transition-all cursor-pointer"
                title="Réinitialiser le Zoom à 100%"
              >
                {Math.round(zoomScale * 100)}%
              </button>
              <button
                onClick={handleZoomIn}
                className="p-1.5 rounded-xl hover:bg-slate-500/10 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                title="Zoomer Avant (+)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPNG}
              className="px-3 py-2 rounded-xl bg-slate-700 text-white font-black text-xs shadow-md flex items-center gap-2 hover:bg-slate-600 transition-all cursor-pointer"
            >
              <Image className="w-4 h-4" /> PNG
            </button>
            <button
              onClick={handleDownloadPDF}
              className="px-3 py-2 rounded-xl bg-indigo-600 text-white font-black text-xs shadow-md flex items-center gap-2 hover:bg-indigo-500 transition-all cursor-pointer"
            >
              <FileText className="w-4 h-4" /> PDF (Direct)
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-black text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-2 hover:bg-emerald-500 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Imprimer
            </button>
          </div>
        </div>

        {/* ZONE DE RENDU CARTE AVEC ZOOM DYNAMIQUE */}
        <div
          className="p-8 overflow-auto flex-1 flex items-center justify-center min-h-[340px]"
          id="card-print-section"
          style={{ background: "var(--bg-sunken)" }}
        >
          <div
            className="transition-transform duration-200 ease-out py-2"
            style={{
              transform: `scale(${zoomScale})`,
              transformOrigin: "center center",
            }}
          >
            {cardModel === "rdc_epst" ? (
              <RDCEleveCardTemplate
                student={student}
                schoolConfig={config}
                face={
                  activeTab === "inner"
                    ? "front"
                    : activeTab === "outer"
                      ? "back"
                      : "both"
                }
              />
            ) : (
              <>
                {activeTab === "inner" && (
                  <IdCardRenderer
                    student={student}
                    schoolConfig={config}
                    face="front"
                  />
                )}
                {activeTab === "outer" && (
                  <IdCardRenderer
                    student={student}
                    schoolConfig={config}
                    face="back"
                  />
                )}
                {activeTab === "unfolded" && (
                  <div className="flex flex-wrap items-start justify-center gap-6">
                    <IdCardRenderer
                      student={student}
                      schoolConfig={config}
                      face="front"
                    />
                    <IdCardRenderer
                      student={student}
                      schoolConfig={config}
                      face="back"
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* PIED */}
        <div
          className="px-6 py-3 border-t flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 no-print"
          style={{
            background: "var(--bg-sunken)",
            borderColor: "var(--border)",
          }}
        >
          <span className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4" /> Prêt pour impression ou export
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-500/10 text-slate-700 dark:text-slate-200 font-black hover:bg-slate-500/20 transition-all cursor-pointer border border-slate-500/20"
          >
            Fermer l'Aperçu
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalJSX, document.body);
};
