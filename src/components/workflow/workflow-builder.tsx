"use client";

/**
 * Visual Workflow Builder — Phase 2
 *
 * Interactive canvas for composing agent orchestrations visually.
 * Built with pure React + CSS (no ReactFlow dependency) to stay
 * consistent with the project's zero-extra-deps philosophy.
 *
 * Features:
 * - Drag-and-drop agent nodes onto a canvas
 * - Connect nodes with handoff rules via click-to-connect
 * - Edit handoff conditions inline
 * - Shared context field editor
 * - Real-time validation feedback
 * - Export to WorkflowDefinition JSON
 */

import { useState, useCallback, useRef, useMemo } from "react";
import { Button } from "@/components/catalyst/button";
import { Subheading } from "@/components/catalyst/heading";
import {
  Plus, Trash2, ArrowRight, GitBranch, Database, Users,
  AlertTriangle, CheckCircle2, Link2, Unlink, GripVertical,
  Play, ZoomIn, ZoomOut, Maximize2,
} from "lucide-react";
import type { WorkflowDefinition, WorkflowAgent, HandoffRule, SharedContextField } from "@/lib/types/workflow";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CanvasNode {
  id: string;
  type: "start" | "end" | "agent" | "human_review";
  x: number;
  y: number;
  agent?: WorkflowAgent;
}

interface CanvasEdge {
  id: string;
  from: string;
  to: string;
  condition: string;
  priority: number;
}

interface WorkflowBuilderProps {
  /** Initial definition to load (for editing existing workflows) */
  initialDefinition?: WorkflowDefinition;
  /** Available agents from the registry (for the agent picker) */
  availableAgents: { agentId: string; name: string; status: string }[];
  /** Called when the definition changes */
  onChange?: (definition: WorkflowDefinition) => void;
  /** Read-only mode */
  readOnly?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NODE_WIDTH = 140;
const NODE_HEIGHT = 56;
const CANVAS_PADDING = 40;

const NODE_STYLES: Record<CanvasNode["type"], { bg: string; border: string; text: string }> = {
  start: { bg: "bg-slate-100 dark:bg-slate-800/40", border: "border-slate-300 dark:border-slate-600", text: "text-slate-600 dark:text-slate-300" },
  end: { bg: "bg-slate-100 dark:bg-slate-800/40", border: "border-slate-300 dark:border-slate-600", text: "text-slate-600 dark:text-slate-300" },
  agent: { bg: "bg-violet-50 dark:bg-violet-950/30", border: "border-violet-200 dark:border-violet-800", text: "text-violet-800 dark:text-violet-200" },
  human_review: { bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800", text: "text-amber-800 dark:text-amber-200" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Convert canvas state to WorkflowDefinition */
function toDefinition(
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  sharedContext: SharedContextField[],
  name: string,
  description: string
): WorkflowDefinition {
  const agents: WorkflowAgent[] = nodes
    .filter((n) => n.type === "agent" && n.agent)
    .map((n) => n.agent!);

  const handoffRules: HandoffRule[] = edges.map((e) => ({
    from: e.from,
    to: e.to,
    condition: e.condition || "always",
    priority: e.priority,
  }));

  return {
    version: "1.0.0",
    name,
    description,
    agents,
    handoffRules,
    sharedContext,
  };
}

/** Initialize canvas from an existing definition */
function fromDefinition(def: WorkflowDefinition): { nodes: CanvasNode[]; edges: CanvasEdge[] } {
  const nodes: CanvasNode[] = [
    { id: "start", type: "start", x: CANVAS_PADDING, y: 200 },
    { id: "end", type: "end", x: 800, y: 200 },
  ];

  // Layout agents in a grid
  def.agents.forEach((agent, i) => {
    const col = Math.floor(i / 3);
    const row = i % 3;
    nodes.push({
      id: agent.agentId,
      type: "agent",
      x: 200 + col * 200,
      y: 80 + row * 120,
      agent,
    });
  });

  // Check for human_review references in handoff rules
  const hasHumanReview = def.handoffRules.some(
    (r) => r.from === "human_review" || r.to === "human_review"
  );
  if (hasHumanReview) {
    nodes.push({ id: "human_review", type: "human_review", x: 500, y: 350 });
  }

  const edges: CanvasEdge[] = def.handoffRules.map((rule, i) => ({
    id: `edge-${i}`,
    from: rule.from,
    to: rule.to,
    condition: rule.condition,
    priority: rule.priority,
  }));

  return { nodes, edges };
}

// ─── SVG Edge Renderer ───────────────────────────────────────────────────────

function EdgePath({ from, to, selected, onClick }: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  selected: boolean;
  onClick: () => void;
}) {
  const startX = from.x + NODE_WIDTH;
  const startY = from.y + NODE_HEIGHT / 2;
  const endX = to.x;
  const endY = to.y + NODE_HEIGHT / 2;

  // Bezier control points for smooth curves
  const midX = (startX + endX) / 2;
  const path = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;

  // Arrow head at the end
  const angle = Math.atan2(endY - startY, endX - startX);
  const arrowSize = 8;
  const arrowX1 = endX - arrowSize * Math.cos(angle - Math.PI / 6);
  const arrowY1 = endY - arrowSize * Math.sin(angle - Math.PI / 6);
  const arrowX2 = endX - arrowSize * Math.cos(angle + Math.PI / 6);
  const arrowY2 = endY - arrowSize * Math.sin(angle + Math.PI / 6);

  return (
    <g onClick={onClick} className="cursor-pointer" tabIndex={0} role="button" aria-label="Select edge" onKeyDown={(e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick?.(); } }} style={{ outline: "none" }} focusable="true">
      {/* Invisible wider path for easier clicking */}
      <path d={path} fill="none" stroke="transparent" strokeWidth={12} />
      <path
        d={path}
        fill="none"
        stroke={selected ? "#7c3aed" : "#d1d5db"}
        strokeWidth={selected ? 2 : 1.5}
        strokeDasharray={selected ? "none" : "none"}
      />
      <polygon
        points={`${endX},${endY} ${arrowX1},${arrowY1} ${arrowX2},${arrowY2}`}
        fill={selected ? "#7c3aed" : "#d1d5db"}
      />
    </g>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WorkflowBuilder({
  initialDefinition,
  availableAgents,
  onChange,
  readOnly = false,
}: WorkflowBuilderProps) {
  // Initialize state from definition or defaults
  const initial = useMemo(() => {
    if (initialDefinition) return fromDefinition(initialDefinition);
    return {
      nodes: [
        { id: "start", type: "start" as const, x: CANVAS_PADDING, y: 200 },
        { id: "end", type: "end" as const, x: 800, y: 200 },
      ],
      edges: [],
    };
  }, [initialDefinition]);

  const [nodes, setNodes] = useState<CanvasNode[]>(initial.nodes);
  const [edges, setEdges] = useState<CanvasEdge[]>(initial.edges);
  const [sharedContext, setSharedContext] = useState<SharedContextField[]>(
    initialDefinition?.sharedContext ?? []
  );
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [dragNode, setDragNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [showAgentPicker, setShowAgentPicker] = useState(false);
  const [showContextEditor, setShowContextEditor] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  // ── Validation ───────────────────────────────────────────────────────────
  const validation = useMemo(() => {
    const errors: string[] = [];
    const agentNodes = nodes.filter((n) => n.type === "agent");
    if (agentNodes.length === 0) errors.push("Add at least one agent");
    const hasStartEdge = edges.some((e) => e.from === "start");
    if (!hasStartEdge && agentNodes.length > 0) errors.push("Connect 'Start' to an agent");
    const hasEndEdge = edges.some((e) => e.to === "end");
    if (!hasEndEdge && agentNodes.length > 0) errors.push("Connect an agent to 'End'");
    return errors;
  }, [nodes, edges]);

  // ── Notify parent of changes ─────────────────────────────────────────────
  const emitChange = useCallback(() => {
    if (!onChange) return;
    const def = toDefinition(
      nodes, edges, sharedContext,
      initialDefinition?.name ?? "New Orchestration",
      initialDefinition?.description ?? ""
    );
    onChange(def);
  }, [nodes, edges, sharedContext, initialDefinition, onChange]);

  // ── Node operations ──────────────────────────────────────────────────────

  const addAgentNode = useCallback((agent: { agentId: string; name: string }) => {
    const newNode: CanvasNode = {
      id: agent.agentId,
      type: "agent",
      x: 200 + Math.random() * 300,
      y: 100 + Math.random() * 200,
      agent: {
        agentId: agent.agentId,
        role: agent.name,
        required: true,
      },
    };
    setNodes((prev) => [...prev, newNode]);
    setShowAgentPicker(false);
    setTimeout(emitChange, 0);
  }, [emitChange]);

  const addHumanReviewNode = useCallback(() => {
    if (nodes.some((n) => n.type === "human_review")) return;
    setNodes((prev) => [
      ...prev,
      { id: "human_review", type: "human_review", x: 400, y: 320 },
    ]);
    setTimeout(emitChange, 0);
  }, [nodes, emitChange]);

  const removeNode = useCallback((nodeId: string) => {
    if (nodeId === "start" || nodeId === "end") return;
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setEdges((prev) => prev.filter((e) => e.from !== nodeId && e.to !== nodeId));
    setSelectedNode(null);
    setTimeout(emitChange, 0);
  }, [emitChange]);

  // ── Edge operations ──────────────────────────────────────────────────────

  const startConnect = useCallback((nodeId: string) => {
    if (readOnly) return;
    setConnectingFrom(nodeId);
  }, [readOnly]);

  const completeConnect = useCallback((toNodeId: string) => {
    if (!connectingFrom || connectingFrom === toNodeId) {
      setConnectingFrom(null);
      return;
    }
    // Don't allow duplicate edges
    if (edges.some((e) => e.from === connectingFrom && e.to === toNodeId)) {
      setConnectingFrom(null);
      return;
    }
    const newEdge: CanvasEdge = {
      id: `edge-${generateId()}`,
      from: connectingFrom,
      to: toNodeId,
      condition: "always",
      priority: edges.filter((e) => e.from === connectingFrom).length,
    };
    setEdges((prev) => [...prev, newEdge]);
    setConnectingFrom(null);
    setTimeout(emitChange, 0);
  }, [connectingFrom, edges, emitChange]);

  const removeEdge = useCallback((edgeId: string) => {
    setEdges((prev) => prev.filter((e) => e.id !== edgeId));
    setSelectedEdge(null);
    setTimeout(emitChange, 0);
  }, [emitChange]);

  const updateEdgeCondition = useCallback((edgeId: string, condition: string) => {
    setEdges((prev) =>
      prev.map((e) => (e.id === edgeId ? { ...e, condition } : e))
    );
    setTimeout(emitChange, 0);
  }, [emitChange]);

  // ── Drag handling ────────────────────────────────────────────────────────

  const handleMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    if (readOnly) return;
    if (connectingFrom) {
      completeConnect(nodeId);
      return;
    }
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    setDragNode(nodeId);
    setDragOffset({
      x: e.clientX / zoom - node.x,
      y: e.clientY / zoom - node.y,
    });
    setSelectedNode(nodeId);
    setSelectedEdge(null);
  }, [readOnly, connectingFrom, completeConnect, nodes, zoom]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragNode) return;
    setNodes((prev) =>
      prev.map((n) =>
        n.id === dragNode
          ? { ...n, x: Math.max(0, e.clientX / zoom - dragOffset.x), y: Math.max(0, e.clientY / zoom - dragOffset.y) }
          : n
      )
    );
  }, [dragNode, dragOffset, zoom]);

  const handleMouseUp = useCallback(() => {
    if (dragNode) {
      setDragNode(null);
      setTimeout(emitChange, 0);
    }
  }, [dragNode, emitChange]);

  // ── Shared Context Editor ────────────────────────────────────────────────

  const addContextField = useCallback(() => {
    setSharedContext((prev) => [
      ...prev,
      { field: `field_${prev.length + 1}`, type: "string", description: "" },
    ]);
  }, []);

  const removeContextField = useCallback((index: number) => {
    setSharedContext((prev) => prev.filter((_, i) => i !== index));
    setTimeout(emitChange, 0);
  }, [emitChange]);

  const updateContextField = useCallback((index: number, updates: Partial<SharedContextField>) => {
    setSharedContext((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...updates } : f))
    );
    setTimeout(emitChange, 0);
  }, [emitChange]);

  // ── Node map for edge rendering ──────────────────────────────────────────
  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  // ── Render ───────────────────────────────────────────────────────────────

  const selectedNodeData = selectedNode ? nodes.find((n) => n.id === selectedNode) : null;
  const selectedEdgeData = selectedEdge ? edges.find((e) => e.id === selectedEdge) : null;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Subheading level={3} className="text-sm">Workflow Builder</Subheading>
          {validation.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-300">
              <AlertTriangle size={10} />
              {validation.length} issue{validation.length !== 1 ? "s" : ""}
            </span>
          )}
          {validation.length === 0 && nodes.filter((n) => n.type === "agent").length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 text-xs text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 size={10} />
              Valid
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {!readOnly && (
            <>
              <button
                onClick={() => setShowAgentPicker(true)}
                className="inline-flex items-center gap-1 rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 px-2.5 py-1.5 text-xs font-medium text-violet-700 dark:text-violet-300 hover:bg-violet-100 transition-colors"
              >
                <Plus size={12} /> Agent
              </button>
              <button
                onClick={addHumanReviewNode}
                disabled={nodes.some((n) => n.type === "human_review")}
                className="inline-flex items-center gap-1 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 disabled:opacity-40 transition-colors"
              >
                <Plus size={12} /> Review Gate
              </button>
              <button
                onClick={() => setShowContextEditor(!showContextEditor)}
                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  showContextEditor
                    ? "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300"
                    : "border-border text-text-secondary hover:bg-surface-raised"
                }`}
              >
                <Database size={12} /> Context ({sharedContext.length})
              </button>
            </>
          )}
          <div className="ml-2 flex items-center gap-0.5 border-l border-border pl-2">
            <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))} className="rounded p-1 text-text-tertiary hover:text-text hover:bg-surface-muted" title="Zoom out" aria-label="Zoom out">
              <ZoomOut size={14} />
            </button>
            <span className="text-xs text-text-tertiary w-10 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom((z) => Math.min(2, z + 0.1))} className="rounded p-1 text-text-tertiary hover:text-text hover:bg-surface-muted" title="Zoom in" aria-label="Zoom in">
              <ZoomIn size={14} />
            </button>
            <button onClick={() => setZoom(1)} className="rounded p-1 text-text-tertiary hover:text-text hover:bg-surface-muted" title="Reset zoom" aria-label="Reset zoom">
              <Maximize2 size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <div
          ref={canvasRef}
          className="relative flex-1 overflow-auto bg-[repeating-linear-gradient(0deg,transparent,transparent_19px,#f1f5f9_19px,#f1f5f9_20px),repeating-linear-gradient(90deg,transparent,transparent_19px,#f1f5f9_19px,#f1f5f9_20px)] cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={() => {
            if (connectingFrom) setConnectingFrom(null);
            setSelectedNode(null);
            setSelectedEdge(null);
          }}
        >
          <div style={{ transform: `scale(${zoom})`, transformOrigin: "0 0", minWidth: "1000px", minHeight: "600px", position: "relative" }}>
            {/* SVG layer for edges */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
              {edges.map((edge) => {
                const fromNode = nodeMap.get(edge.from);
                const toNode = nodeMap.get(edge.to);
                if (!fromNode || !toNode) return null;
                return (
                  <g key={edge.id} style={{ pointerEvents: "auto" }}>
                    <EdgePath
                      from={fromNode}
                      to={toNode}
                      selected={selectedEdge === edge.id}
                      onClick={() => {
                        setSelectedEdge(edge.id);
                        setSelectedNode(null);
                      }}
                    />
                    {/* Condition label on edge midpoint */}
                    {edge.condition && edge.condition !== "always" && (
                      <text
                        x={(fromNode.x + NODE_WIDTH + toNode.x) / 2}
                        y={(fromNode.y + toNode.y) / 2 + NODE_HEIGHT / 2 - 8}
                        textAnchor="middle"
                        className="fill-text-tertiary text-[9px] font-mono pointer-events-none"
                      >
                        {edge.condition.length > 30 ? edge.condition.slice(0, 27) + "…" : edge.condition}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Nodes */}
            {nodes.map((node) => {
              const style = NODE_STYLES[node.type];
              const isSelected = selectedNode === node.id;
              const isConnecting = connectingFrom !== null;
              const isConnectTarget = isConnecting && connectingFrom !== node.id;

              return (
                <div
                  key={node.id}
                  className={`absolute select-none rounded-xl border-2 px-3 py-2 text-center transition-shadow ${style.bg} ${style.text} ${
                    isSelected ? "border-violet-500 shadow-lg ring-2 ring-violet-200" :
                    isConnectTarget ? "border-dashed border-violet-400 shadow-md" :
                    style.border
                  } ${!readOnly ? "cursor-grab active:cursor-grabbing" : ""}`}
                  style={{
                    left: node.x,
                    top: node.y,
                    width: NODE_WIDTH,
                    height: NODE_HEIGHT,
                    zIndex: isSelected ? 10 : 2,
                  }}
                  onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, node.id); }}
                  onClick={(e) => { e.stopPropagation(); }}
                >
                  {/* Node label */}
                  <div className="flex flex-col items-center justify-center h-full">
                    {node.type === "start" && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider">Start</span>
                    )}
                    {node.type === "end" && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider">End</span>
                    )}
                    {node.type === "human_review" && (
                      <>
                        <span className="text-[10px] font-semibold uppercase tracking-wider">Human Review</span>
                        <span className="text-[8px] opacity-60">Pause for approval</span>
                      </>
                    )}
                    {node.type === "agent" && node.agent && (
                      <>
                        <span className="text-xs font-semibold leading-tight truncate max-w-full">
                          {node.agent.role}
                        </span>
                        <span className="mt-0.5 font-mono text-[8px] opacity-50">
                          {node.agent.agentId.slice(0, 8)}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Connect handle (right side) */}
                  {!readOnly && node.id !== "end" && (
                    <button
                      className="absolute -right-2 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-white dark:bg-slate-800 border-2 border-violet-300 dark:border-violet-700 hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50"
                      title="Connect to another node" aria-label="Connect to another node"
                      onMouseDown={(e) => { e.stopPropagation(); startConnect(node.id); }}
                    />
                  )}

                  {/* Delete button */}
                  {!readOnly && isSelected && node.type !== "start" && node.type !== "end" && (
                    <button
                      className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center justify-center hover:bg-red-200 z-20"
                      onClick={(e) => { e.stopPropagation(); removeNode(node.id); }}
                      title="Remove node" aria-label="Remove node"
                    >
                      <Trash2 size={10} />
                    </button>
                  )}
                </div>
              );
            })}

            {/* Connection mode indicator */}
            {connectingFrom && (
              <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-violet-600 px-3 py-1.5 text-xs text-white shadow-lg">
                Click a target node to connect, or click canvas to cancel
              </div>
            )}
          </div>
        </div>

        {/* Properties panel (right sidebar) */}
        {(selectedNodeData || selectedEdgeData || showContextEditor) && (
          <div className="w-72 shrink-0 border-l border-border bg-surface overflow-y-auto">
            {/* Edge properties */}
            {selectedEdgeData && (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-text">Handoff Rule</span>
                  {!readOnly && (
                    <button onClick={() => removeEdge(selectedEdgeData.id)} className="text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300">
                      Remove
                    </button>
                  )}
                </div>
                <div className="rounded-lg bg-surface-muted px-3 py-2 text-xs text-text-secondary">
                  <span className="font-mono">{selectedEdgeData.from}</span>
                  <ArrowRight size={10} className="inline mx-1" />
                  <span className="font-mono">{selectedEdgeData.to}</span>
                </div>
                <div>
                  <label className="text-xs font-medium text-text">Condition</label>
                  <input
                    type="text"
                    value={selectedEdgeData.condition}
                    onChange={(e) => updateEdgeCondition(selectedEdgeData.id, e.target.value)}
                    disabled={readOnly}
                    placeholder="e.g., classification === 'urgent'"
                    className="mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-mono text-text placeholder-text-tertiary focus:border-violet-500 focus:outline-none disabled:opacity-50"
                  />
                  <p className="mt-1 text-[10px] text-text-tertiary">Use "always" for unconditional transitions</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-text">Priority</label>
                  <input
                    type="number"
                    value={selectedEdgeData.priority}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setEdges((prev) =>
                        prev.map((edge) => (edge.id === selectedEdgeData.id ? { ...edge, priority: isNaN(val) ? 0 : val } : edge))
                      );
                    }}
                    disabled={readOnly}
                    min={0}
                    className="mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-text focus:border-violet-500 focus:outline-none disabled:opacity-50"
                  />
                  <p className="mt-1 text-[10px] text-text-tertiary">Lower priority evaluates first when multiple rules share a source</p>
                </div>
              </div>
            )}

            {/* Node properties */}
            {selectedNodeData && !selectedEdgeData && selectedNodeData.type === "agent" && (
              <div className="p-4 space-y-3">
                <span className="text-xs font-semibold text-text">Agent Node</span>
                <div>
                  <label className="text-xs font-medium text-text">Role</label>
                  <input
                    type="text"
                    value={selectedNodeData.agent?.role ?? ""}
                    onChange={(e) => {
                      setNodes((prev) =>
                        prev.map((n) =>
                          n.id === selectedNodeData.id && n.agent
                            ? { ...n, agent: { ...n.agent, role: e.target.value } }
                            : n
                        )
                      );
                    }}
                    disabled={readOnly}
                    className="mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-text focus:border-violet-500 focus:outline-none disabled:opacity-50"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedNodeData.agent?.required ?? true}
                    onChange={(e) => {
                      setNodes((prev) =>
                        prev.map((n) =>
                          n.id === selectedNodeData.id && n.agent
                            ? { ...n, agent: { ...n.agent, required: e.target.checked } }
                            : n
                        )
                      );
                    }}
                    disabled={readOnly}
                    className="rounded border-border"
                  />
                  <label className="text-xs text-text-secondary">Required agent</label>
                </div>
                <div className="rounded-lg bg-surface-muted px-3 py-2">
                  <span className="text-[10px] text-text-tertiary">Agent ID</span>
                  <p className="font-mono text-xs text-text">{selectedNodeData.agent?.agentId}</p>
                </div>
              </div>
            )}

            {/* Shared Context Editor */}
            {showContextEditor && (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-text">Shared Context</span>
                  {!readOnly && (
                    <button onClick={addContextField} className="text-xs text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300">
                      + Add Field
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-text-tertiary">Fields accessible to all agents during orchestration.</p>
                {sharedContext.length === 0 && (
                  <p className="text-xs text-text-tertiary italic">No shared context fields defined.</p>
                )}
                {sharedContext.map((field, i) => (
                  <div key={i} className="rounded-lg border border-border-subtle bg-surface-muted p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <input
                        type="text"
                        value={field.field}
                        onChange={(e) => updateContextField(i, { field: e.target.value })}
                        disabled={readOnly}
                        placeholder="field.name"
                        className="flex-1 rounded border-none bg-transparent px-0 text-xs font-mono text-text focus:outline-none disabled:opacity-50"
                      />
                      {!readOnly && (
                        <button onClick={() => removeContextField(i)} className="text-text-tertiary hover:text-red-500 dark:text-red-400">
                          <Trash2 size={10} />
                        </button>
                      )}
                    </div>
                    <div className="flex gap-1.5">
                      <select
                        value={field.type}
                        onChange={(e) => updateContextField(i, { type: e.target.value as SharedContextField["type"] })}
                        disabled={readOnly}
                        className="rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] text-text-secondary"
                      >
                        <option value="string">string</option>
                        <option value="number">number</option>
                        <option value="boolean">boolean</option>
                        <option value="json">json</option>
                      </select>
                    </div>
                    <input
                      type="text"
                      value={field.description}
                      onChange={(e) => updateContextField(i, { description: e.target.value })}
                      disabled={readOnly}
                      placeholder="Description…"
                      className="w-full rounded border-none bg-transparent px-0 text-[10px] text-text-tertiary focus:outline-none disabled:opacity-50"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Agent Picker Modal */}
      {showAgentPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowAgentPicker(false)}>
          <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <Subheading level={3} className="text-sm mb-3">Add Agent to Canvas</Subheading>
            {availableAgents.length === 0 ? (
              <p className="text-xs text-text-tertiary">No agents available. Create and approve agents first.</p>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-1">
                {availableAgents
                  .filter((a) => !nodes.some((n) => n.id === a.agentId))
                  .map((agent) => (
                    <button
                      key={agent.agentId}
                      onClick={() => addAgentNode(agent)}
                      className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-surface-muted transition-colors"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-violet-50 dark:bg-violet-950/30 text-violet-500">
                        <Users size={12} />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-text">{agent.name}</span>
                        <span className="ml-2 text-xs text-text-tertiary">{agent.status}</span>
                      </div>
                    </button>
                  ))}
                {availableAgents.filter((a) => !nodes.some((n) => n.id === a.agentId)).length === 0 && (
                  <p className="text-xs text-text-tertiary py-2">All available agents are already on the canvas.</p>
                )}
              </div>
            )}
            <div className="mt-3 flex justify-end">
              <Button plain onClick={() => setShowAgentPicker(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Validation errors */}
      {validation.length > 0 && (
        <div className="border-t border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-2">
          <div className="flex items-start gap-2">
            <AlertTriangle size={12} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="text-xs text-amber-800 dark:text-amber-200">
              {validation.map((err, i) => (
                <span key={i}>{i > 0 ? " · " : ""}{err}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
