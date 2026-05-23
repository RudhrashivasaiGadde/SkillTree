const WORLD = { width: 12000, height: 9000 };
const palette = ["#18d8ca", "#ff7a57", "#ffd15f", "#7e8cff", "#27df93", "#ff6ea4"];

const state = {
  profileId: "default",
  profile: {
    name: "Your Profile",
  },
  profileNode: {
    id: "profile",
    type: "profile",
    title: "Your Profile",
    subtitle: "Stored locally",
    kicker: "Profile",
    color: "#18d8ca",
    x: WORLD.width / 2,
    y: WORLD.height / 2,
  },
  skills: [],
  projects: [],
  certificates: [],
  customEdges: [],
  cutEdges: new Set(),
  expandedSkills: new Set(),
  expandedBuckets: new Set(),
  categoryNodes: new Map(),
  connectMode: false,
  connectSource: null,
  cutMode: false,
  cutSource: null,
  activeNodeId: "profile",
  activeProjectId: null,
  activeCertificateId: null,
  suppressClickId: null,
  proMode: false,
  proDrawerOpen: false,
  editorMode: "skill",
  editingId: null,
  nodeMenuTarget: null,
  view: {
    x: 0,
    y: 0,
    scale: 0.75,
  },
};

const els = {
  canvas: document.querySelector("#graphCanvas"),
  graphWorld: document.querySelector("#graphWorld"),
  appShell: document.querySelector("#appShell"),
  homeScreen: document.querySelector("#homeScreen"),
  homeLoadProfileBtn: document.querySelector("#homeLoadProfileBtn"),
  homeCreateProfileBtn: document.querySelector("#homeCreateProfileBtn"),
  loadingScreen: document.querySelector("#loadingScreen"),
  nodeLayer: document.querySelector("#nodeLayer"),
  edgeGroup: document.querySelector("#edgeGroup"),
  graphStats: document.querySelector("#graphStats"),
  connectStatus: document.querySelector("#connectStatus"),
  addSkillBtn: document.querySelector("#addSkillBtn"),
  addSubskillBtn: document.querySelector("#addSubskillBtn"),
  addProjectBtn: document.querySelector("#addProjectBtn"),
  addCertificateBtn: document.querySelector("#addCertificateBtn"),
  connectBtn: document.querySelector("#connectBtn"),
  cutBtn: document.querySelector("#cutBtn"),
  zoomOutBtn: document.querySelector("#zoomOutBtn"),
  zoomInBtn: document.querySelector("#zoomInBtn"),
  arrangeBtn: document.querySelector("#arrangeBtn"),
  proModeBtn: document.querySelector("#proModeBtn"),
  proMenuBtn: document.querySelector("#proMenuBtn"),
  proDrawer: document.querySelector("#proDrawer"),
  closeProDrawerBtn: document.querySelector("#closeProDrawerBtn"),
  profileForm: document.querySelector("#profileForm"),
  profileId: document.querySelector("#profileId"),
  profileName: document.querySelector("#profileName"),
  loadProfileBtn: document.querySelector("#loadProfileBtn"),
  profilePreview: document.querySelector("#profilePreview"),
  editorEyebrow: document.querySelector("#editorEyebrow"),
  editorTitle: document.querySelector("#editorTitle"),
  skillForm: document.querySelector("#skillForm"),
  skillName: document.querySelector("#skillName"),
  skillFocus: document.querySelector("#skillFocus"),
  skillParentLabel: document.querySelector("#skillParentLabel"),
  skillParent: document.querySelector("#skillParent"),
  skillProjectBranch: document.querySelector("#skillProjectBranch"),
  skillCertificateBranch: document.querySelector("#skillCertificateBranch"),
  skillColor: document.querySelector("#skillColor"),
  skillSubmitBtn: document.querySelector("#skillSubmitBtn"),
  projectForm: document.querySelector("#projectForm"),
  projectName: document.querySelector("#projectName"),
  projectSkills: document.querySelector("#projectSkills"),
  projectPreview: document.querySelector("#projectPreview"),
  projectSummary: document.querySelector("#projectSummary"),
  projectLink: document.querySelector("#projectLink"),
  projectSubmitBtn: document.querySelector("#projectSubmitBtn"),
  certificateForm: document.querySelector("#certificateForm"),
  certificateName: document.querySelector("#certificateName"),
  certificateSkill: document.querySelector("#certificateSkill"),
  certificateIssuer: document.querySelector("#certificateIssuer"),
  certificatePdf: document.querySelector("#certificatePdf"),
  certificateSubmitBtn: document.querySelector("#certificateSubmitBtn"),
  detailsTitle: document.querySelector("#detailsTitle"),
  detailsCopy: document.querySelector("#detailsCopy"),
  detailsChips: document.querySelector("#detailsChips"),
  selectionActions: document.querySelector("#selectionActions"),
  editSelectedBtn: document.querySelector("#editSelectedBtn"),
  deleteSelectedBtn: document.querySelector("#deleteSelectedBtn"),
  toolModal: document.querySelector("#toolModal"),
  modalFormMount: document.querySelector("#modalFormMount"),
  closeModalBtn: document.querySelector("#closeModalBtn"),
  modalTitle: document.querySelector("#modalTitle"),
  modalEyebrow: document.querySelector("#modalEyebrow"),
  projectDetailCard: document.querySelector("#projectDetailCard"),
  closeProjectDetailBtn: document.querySelector("#closeProjectDetailBtn"),
  detailEyebrow: document.querySelector("#detailEyebrow"),
  projectDetailTitle: document.querySelector("#projectDetailTitle"),
  projectDetailPreview: document.querySelector("#projectDetailPreview"),
  projectDetailDescription: document.querySelector("#projectDetailDescription"),
  projectDetailLink: document.querySelector("#projectDetailLink"),
  editDetailBtn: document.querySelector("#editDetailBtn"),
  deleteDetailBtn: document.querySelector("#deleteDetailBtn"),
  nodeMenu: document.querySelector("#nodeMenu"),
  nodeMenuTitle: document.querySelector("#nodeMenuTitle"),
};

const formHome = els.skillForm.parentElement;
const formOrder = [els.skillForm, els.projectForm, els.certificateForm];
let dragState = null;
let panState = null;
let resizeTimer = null;
let saveTimer = null;
let loadingProfile = false;

function normalize(value) {
  return String(value).trim().toLowerCase().replace(/\s+/g, " ");
}

function slugify(value) {
  const slug = String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug || `item-${Date.now()}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function parseList(value) {
  return String(value)
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, array) => array.findIndex((next) => normalize(next) === normalize(item)) === index);
}

function canvasSize() {
  const rect = els.canvas.getBoundingClientRect();
  return {
    width: Math.max(rect.width, 360),
    height: Math.max(rect.height, 460),
  };
}

function canvasPoint(event) {
  const rect = els.canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function worldPoint(event) {
  const point = canvasPoint(event);
  return {
    x: (point.x - state.view.x) / state.view.scale,
    y: (point.y - state.view.y) / state.view.scale,
  };
}

function applyViewport() {
  els.graphWorld.style.transform = `translate(${state.view.x}px, ${state.view.y}px) scale(${state.view.scale})`;
}

function zoomAt(point, factor) {
  const oldScale = state.view.scale;
  const nextScale = clamp(oldScale * factor, 0.35, 1.9);
  const worldX = (point.x - state.view.x) / oldScale;
  const worldY = (point.y - state.view.y) / oldScale;

  state.view.scale = nextScale;
  state.view.x = point.x - worldX * nextScale;
  state.view.y = point.y - worldY * nextScale;
  applyViewport();
}

function zoomAtCenter(factor) {
  const size = canvasSize();
  zoomAt({ x: size.width / 2, y: size.height / 2 }, factor);
}

function categoryId(kind, skillId) {
  return `category-${kind}-${skillId}`;
}

function bucketKey(kind, skillId) {
  return `${kind}:${skillId}`;
}

function ensureCategory(kind, skillId) {
  const id = categoryId(kind, skillId);
  if (!state.categoryNodes.has(id)) {
    state.categoryNodes.set(id, {
      id,
      type: "category",
      kind,
      skillId,
      title: kind === "projects" ? "Projects" : "Certifications",
      subtitle: kind === "projects" ? "Made with this skill" : "Proof and credentials",
      kicker: "Branch",
      color: kind === "projects" ? "#7e8cff" : "#ffd15f",
      x: 0,
      y: 0,
    });
  }
  return state.categoryNodes.get(id);
}

function findSkillByName(name) {
  const needle = normalize(name);
  return state.skills.find((skill) => normalize(skill.title) === needle);
}

function findSkillById(id) {
  return state.skills.find((skill) => skill.id === id);
}

function findProjectById(id) {
  return state.projects.find((project) => project.id === id);
}

function findCertificateById(id) {
  return state.certificates.find((certificate) => certificate.id === id);
}

function findNode(id) {
  if (id === "profile") return state.profileNode;
  if (state.categoryNodes.has(id)) return state.categoryNodes.get(id);
  return findSkillById(id) || findProjectById(id) || findCertificateById(id);
}

function skillChildren(skillId) {
  return state.skills.filter((skill) => skill.parentSkillId === skillId);
}

function rootSkills() {
  return state.skills.filter((skill) => !skill.parentSkillId);
}

function projectsForSkill(skillId) {
  return state.projects.filter((project) => project.skillIds.includes(skillId));
}

function certificatesForSkill(skillId) {
  return state.certificates.filter((certificate) => certificate.skillId === skillId);
}

function skillHasProjectBranch(skill) {
  return Boolean(skill?.showProjectBranch || projectsForSkill(skill.id).length);
}

function skillHasCertificateBranch(skill) {
  return Boolean(skill?.showCertificateBranch || certificatesForSkill(skill.id).length);
}

function projectAccent(project) {
  const firstSkill = project.skillIds.map(findSkillById).find(Boolean);
  return firstSkill ? firstSkill.color : "#7e8cff";
}

function certificateAccent(certificate) {
  const skill = findSkillById(certificate.skillId);
  return skill ? skill.color : "#ffd15f";
}

function visibleNodes() {
  const nodes = [];
  const seen = new Set();
  function pushNode(node) {
    if (seen.has(node.id)) return;
    seen.add(node.id);
    nodes.push(node);
  }

  pushNode(state.profileNode);

  function visitSkill(skill) {
    pushNode(skill);
    if (!state.expandedSkills.has(skill.id)) return;

    skillChildren(skill.id).forEach(visitSkill);

    const hasProjectBranch = skillHasProjectBranch(skill);
    const hasCertificateBranch = skillHasCertificateBranch(skill);
    const projectCategory = hasProjectBranch ? ensureCategory("projects", skill.id) : null;
    const certificateCategory = hasCertificateBranch ? ensureCategory("certificates", skill.id) : null;
    if (projectCategory) pushNode(projectCategory);
    if (certificateCategory) pushNode(certificateCategory);

    if (projectCategory && state.expandedBuckets.has(bucketKey("projects", skill.id))) {
      projectsForSkill(skill.id).forEach(pushNode);
    }

    if (certificateCategory && state.expandedBuckets.has(bucketKey("certificates", skill.id))) {
      certificatesForSkill(skill.id).forEach(pushNode);
    }
  }

  rootSkills().forEach(visitSkill);
  return nodes;
}

function visibleNodeMap() {
  return new Map(visibleNodes().map((node) => [node.id, node]));
}

function allPersistentNodes() {
  return [state.profileNode, ...state.skills, ...state.projects, ...state.certificates];
}

function hasPosition(node) {
  return Number.isFinite(node.x) && Number.isFinite(node.y) && node.x > 0 && node.y > 0;
}

function arrangeGraph(reset = false) {
  if (reset) {
    allPersistentNodes().forEach((node) => {
      node.pinned = false;
    });
    state.categoryNodes.forEach((node) => {
      node.pinned = false;
    });
  }

  if (reset || !state.profileNode.pinned || !hasPosition(state.profileNode)) {
    state.profileNode.x = WORLD.width / 2;
    state.profileNode.y = WORLD.height / 2;
  }

  const roots = rootSkills();
  const rootRadiusX = 430;
  const rootRadiusY = 290;
  const profile = state.profileNode;

  roots.forEach((skill, index) => {
    if (reset || !skill.pinned || !hasPosition(skill)) {
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / Math.max(roots.length, 1);
      skill.x = clamp(profile.x + Math.cos(angle) * rootRadiusX, 120, WORLD.width - 120);
      skill.y = clamp(profile.y + Math.sin(angle) * rootRadiusY, 110, WORLD.height - 110);
    }
    arrangeSkillBranches(skill, profile, reset, 1);
  });

  render();
}

function arrangeSkillBranches(skill, parent, reset, depth) {
  if (!state.expandedSkills.has(skill.id)) return;

  const baseAngle = Math.atan2(skill.y - parent.y, skill.x - parent.x) || -Math.PI / 2;
  const children = skillChildren(skill.id);
  const projectCategory = skillHasProjectBranch(skill) ? ensureCategory("projects", skill.id) : null;
  const certificateCategory = skillHasCertificateBranch(skill) ? ensureCategory("certificates", skill.id) : null;
  const branchNodes = [...children, projectCategory, certificateCategory].filter(Boolean);
  const distance = depth > 1 ? 185 : 205;

  branchNodes.forEach((node, index) => {
    if (reset || !node.pinned || !hasPosition(node)) {
      const spread = branchNodes.length > 1 ? 0.42 : 0;
      const offset = (index - (branchNodes.length - 1) / 2) * spread;
      node.x = clamp(skill.x + Math.cos(baseAngle + offset) * distance, 110, WORLD.width - 110);
      node.y = clamp(skill.y + Math.sin(baseAngle + offset) * distance, 92, WORLD.height - 92);
    }
  });

  children.forEach((child) => arrangeSkillBranches(child, skill, reset, depth + 1));
  if (projectCategory) arrangeBucketItems(projectCategory, projectsForSkill(skill.id), baseAngle - 0.18, reset);
  if (certificateCategory) arrangeBucketItems(certificateCategory, certificatesForSkill(skill.id), baseAngle + 0.18, reset);
}

function arrangeBucketItems(category, items, angle, reset) {
  if (!state.expandedBuckets.has(bucketKey(category.kind, category.skillId))) return;

  items.forEach((item, index) => {
    if (reset || !item.pinned || !hasPosition(item)) {
      const spread = items.length > 1 ? 0.34 : 0;
      const offset = (index - (items.length - 1) / 2) * spread;
      item.x = clamp(category.x + Math.cos(angle + offset) * 165, 110, WORLD.width - 110);
      item.y = clamp(category.y + Math.sin(angle + offset) * 165, 92, WORLD.height - 92);
    }
  });
}

function boundsForVisibleNodes() {
  const nodes = visibleNodes();
  const xs = nodes.map((node) => node.x);
  const ys = nodes.map((node) => node.y);
  return {
    left: Math.min(...xs) - 170,
    right: Math.max(...xs) + 170,
    top: Math.min(...ys) - 145,
    bottom: Math.max(...ys) + 145,
  };
}

function fitGraph() {
  const size = canvasSize();
  const bounds = boundsForVisibleNodes();
  const width = Math.max(bounds.right - bounds.left, 1);
  const height = Math.max(bounds.bottom - bounds.top, 1);
  const nextScale = clamp(Math.min(size.width / width, size.height / height) * 0.92, 0.35, 1.35);

  state.view.scale = nextScale;
  state.view.x = (size.width - width * nextScale) / 2 - bounds.left * nextScale;
  state.view.y = (size.height - height * nextScale) / 2 - bounds.top * nextScale;
  applyViewport();
}

function edgeKey(edge) {
  return `${edge.source}->${edge.target}`;
}

function reverseEdgeKey(edge) {
  return `${edge.target}->${edge.source}`;
}

function edgeMatches(edge, source, target) {
  return (edge.source === source && edge.target === target) || (edge.source === target && edge.target === source);
}

function isEdgeCut(edge) {
  return state.cutEdges.has(edgeKey(edge)) || state.cutEdges.has(reverseEdgeKey(edge));
}

function naturalEdgeBetween(source, target) {
  return naturalEdges(true).find((edge) => edgeMatches(edge, source, target));
}

function naturalEdges(includeHidden = false) {
  const visible = visibleNodeMap();
  const edges = [];

  state.skills.forEach((skill) => {
    if (!includeHidden && !visible.has(skill.id)) return;
    const source = skill.parentSkillId || "profile";
    if (includeHidden || visible.has(source)) {
      edges.push({ source, target: skill.id, type: "skill" });
    }

    if (state.expandedSkills.has(skill.id) || includeHidden) {
      const projectCategory = skillHasProjectBranch(skill) ? ensureCategory("projects", skill.id) : null;
      const certificateCategory = skillHasCertificateBranch(skill) ? ensureCategory("certificates", skill.id) : null;
      if (projectCategory) edges.push({ source: skill.id, target: projectCategory.id, type: "branch" });
      if (certificateCategory) edges.push({ source: skill.id, target: certificateCategory.id, type: "certificate" });

      projectsForSkill(skill.id).forEach((project) => {
        if (projectCategory && (includeHidden || (visible.has(projectCategory.id) && visible.has(project.id)))) {
          edges.push({ source: projectCategory.id, target: project.id, type: "project" });
        }
      });

      certificatesForSkill(skill.id).forEach((certificate) => {
        if (certificateCategory && (includeHidden || (visible.has(certificateCategory.id) && visible.has(certificate.id)))) {
          edges.push({ source: certificateCategory.id, target: certificate.id, type: "certificate" });
        }
      });
    }
  });

  return edges;
}

function edgeList() {
  const visible = visibleNodeMap();
  const natural = naturalEdges(false);
  const custom = state.customEdges
    .filter((edge) => visible.has(edge.source) && visible.has(edge.target))
    .map((edge) => ({ ...edge, type: "custom" }));
  return [...natural, ...custom].filter((edge) => !isEdgeCut(edge));
}

function relatedNodeIds(activeId = state.activeNodeId) {
  const ids = new Set([activeId]);
  edgeList().forEach((edge) => {
    if (edge.source === activeId) ids.add(edge.target);
    if (edge.target === activeId) ids.add(edge.source);
  });

  const active = findNode(activeId);
  if (active?.type === "project") {
    active.skillIds.forEach((skillId) => ids.add(skillId));
  }
  if (active?.type === "certificate" && active.skillId) {
    ids.add(active.skillId);
  }
  return ids;
}

function edgeIsRelated(edge) {
  return edge.source === state.activeNodeId || edge.target === state.activeNodeId || relatedNodeIds().has(edge.source);
}

function pathForEdge(source, target, index, type) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const distance = Math.max(Math.hypot(dx, dy), 1);
  const normalX = -dy / distance;
  const normalY = dx / distance;
  const bendBase = type === "custom" ? 0.18 : 0.12;
  const bend = Math.min(78, Math.max(24, distance * bendBase)) * (index % 2 === 0 ? 1 : -1);
  const c1x = source.x + dx * 0.38 + normalX * bend;
  const c1y = source.y + dy * 0.38 + normalY * bend;
  const c2x = target.x - dx * 0.38 + normalX * bend;
  const c2y = target.y - dy * 0.38 + normalY * bend;
  return `M ${source.x} ${source.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${target.x} ${target.y}`;
}

function drawEdges() {
  const visible = visibleNodeMap();
  const markup = edgeList()
    .map((edge, index) => {
      const source = visible.get(edge.source);
      const target = visible.get(edge.target);
      if (!source || !target) return "";

      const path = pathForEdge(source, target, index, edge.type);
      const related = edgeIsRelated(edge);
      const classes = ["edge-path", edge.type, related ? "is-highlighted" : "is-dimmed"].filter(Boolean).join(" ");
      const dotClasses = ["edge-dot", related ? "" : "is-dimmed"].filter(Boolean).join(" ");
      return `
        <path class="${classes}" data-edge="${escapeHtml(edgeKey(edge))}" data-source="${escapeHtml(edge.source)}" data-target="${escapeHtml(edge.target)}" data-type="${escapeHtml(edge.type)}" d="${path}"></path>
        <path class="edge-hit" data-edge="${escapeHtml(edgeKey(edge))}" data-source="${escapeHtml(edge.source)}" data-target="${escapeHtml(edge.target)}" data-type="${escapeHtml(edge.type)}" d="${path}"></path>
        <circle class="${dotClasses}" cx="${target.x}" cy="${target.y}" r="4"></circle>
      `;
    })
    .join("");

  els.edgeGroup.innerHTML = markup;
}

function nodeMarkup(node) {
  const related = relatedNodeIds();
  const classes = [
    "graph-node",
    node.type,
    node.kind || "",
    state.activeNodeId === node.id ? "is-selected" : "",
    state.connectSource === node.id ? "is-connect-source" : "",
    state.cutSource === node.id ? "is-cut-source" : "",
    state.activeNodeId && !related.has(node.id) ? "is-dimmed" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const profileInitial = node.type === "profile" ? `<span class="node-avatar">${escapeHtml(getInitials(node.title))}</span>` : "";
  const kicker = node.type === "profile" ? "" : `<span class="node-kicker">${escapeHtml(node.kicker || node.type)}</span>`;

  return `
    <button class="${classes}" data-node-id="${escapeHtml(node.id)}" type="button" style="--node-color: ${node.color || "#18d8ca"}">
      ${profileInitial}
      ${kicker}
      <span class="node-title">${escapeHtml(node.title)}</span>
      <span class="node-subtitle">${escapeHtml(node.subtitle || "")}</span>
    </button>
  `;
}

function positionNodes() {
  visibleNodes().forEach((node) => {
    const element = els.nodeLayer.querySelector(`[data-node-id="${CSS.escape(node.id)}"]`);
    if (!element) return;
    element.style.left = `${node.x}px`;
    element.style.top = `${node.y}px`;
  });
}

function renderNodes() {
  els.nodeLayer.innerHTML = visibleNodes().map(nodeMarkup).join("");
  positionNodes();
}

function updateSkillOptions() {
  const currentParent = els.skillParent.value;
  const currentCert = els.certificateSkill.value;
  const blockedParents =
    state.editorMode === "edit-skill" && state.editingId
      ? new Set([state.editingId, ...descendantSkillIds(state.editingId)])
      : new Set();
  const rootLabel = state.editorMode === "subskill" ? "Choose a parent skill" : "Profile root";
  const parentOptions = [`<option value="">${rootLabel}</option>`]
    .concat(
      state.skills
        .filter((skill) => !blockedParents.has(skill.id))
        .map((skill) => `<option value="${escapeHtml(skill.id)}">${escapeHtml(skill.title)}</option>`),
    )
    .join("");
  const skillOptions = state.skills
    .map((skill) => `<option value="${escapeHtml(skill.id)}">${escapeHtml(skill.title)}</option>`)
    .join("");

  els.skillParent.innerHTML = parentOptions;
  els.certificateSkill.innerHTML = skillOptions || `<option value="">Add a skill first</option>`;

  if (state.skills.some((skill) => skill.id === currentParent)) els.skillParent.value = currentParent;
  if (state.skills.some((skill) => skill.id === currentCert)) els.certificateSkill.value = currentCert;
}

function updateStats() {
  els.graphStats.innerHTML = `
    <span class="stat-pill">${state.skills.length} skills</span>
    <span class="stat-pill">${state.projects.length} projects</span>
    <span class="stat-pill">${state.certificates.length} certs</span>
    <span class="stat-pill">${edgeList().length} paths</span>
  `;
}

function chipMarkup(label, color = "#18d8ca") {
  return `<span class="chip"><span class="chip-dot" style="--chip-color: ${color}"></span>${escapeHtml(label)}</span>`;
}

function descendantSkillIds(skillId) {
  const ids = [];
  function walk(parentId) {
    skillChildren(parentId).forEach((child) => {
      ids.push(child.id);
      walk(child.id);
    });
  }
  walk(skillId);
  return ids;
}

function selectedEditableNode() {
  const node = findNode(state.activeNodeId);
  return ["skill", "project", "certificate"].includes(node?.type) ? node : null;
}

function editorLabels(mode) {
  const labels = {
    skill: ["Composer", "Add skill", "Add skill"],
    subskill: ["Subskill", "Add subskill", "Add subskill"],
    project: ["Project", "Add project", "Add project"],
    certificate: ["Certification", "Add certificate", "Add certificate"],
    "edit-skill": ["Skill", "Update skill", "Update skill"],
    "edit-project": ["Project", "Update project", "Update project"],
    "edit-certificate": ["Certification", "Update certificate", "Update certificate"],
  };
  return labels[mode] || labels.skill;
}

function formForEditor(mode) {
  if (mode === "project" || mode === "edit-project") return els.projectForm;
  if (mode === "certificate" || mode === "edit-certificate") return els.certificateForm;
  return els.skillForm;
}

function resetFormForMode(mode) {
  if (mode === "skill" || mode === "subskill") {
    els.skillForm.reset();
    els.skillColor.value = palette[state.skills.length % palette.length];
    els.skillProjectBranch.checked = false;
    els.skillCertificateBranch.checked = false;
    els.skillParent.value = mode === "subskill" && findNode(state.activeNodeId)?.type === "skill" ? state.activeNodeId : "";
  }
  if (mode === "project") els.projectForm.reset();
  if (mode === "certificate") els.certificateForm.reset();
}

function populateEditorForm() {
  const mode = state.editorMode;

  if (mode === "edit-skill") {
    const skill = findSkillById(state.editingId);
    if (!skill) return;
    els.skillName.value = skill.title;
    els.skillFocus.value = skill.subtitle || "";
    els.skillColor.value = skill.color || palette[0];
    els.skillParent.value = skill.parentSkillId || "";
    els.skillProjectBranch.checked = skillHasProjectBranch(skill);
    els.skillCertificateBranch.checked = skillHasCertificateBranch(skill);
  }

  if (mode === "edit-project") {
    const project = findProjectById(state.editingId);
    if (!project) return;
    els.projectName.value = project.title;
    els.projectSkills.value = project.skillIds.map((id) => findSkillById(id)?.title).filter(Boolean).join(", ");
    els.projectPreview.value = project.preview || "";
    els.projectSummary.value = project.summary || "";
    els.projectLink.value = project.link || "";
  }

  if (mode === "edit-certificate") {
    const certificate = findCertificateById(state.editingId);
    if (!certificate) return;
    els.certificateName.value = certificate.title;
    els.certificateSkill.value = certificate.skillId || "";
    els.certificateIssuer.value = certificate.issuer || "";
    els.certificatePdf.value = certificate.pdfUrl || "";
  }
}

function updateEditorControls() {
  const mode = state.editorMode || "skill";
  const [eyebrow, title, button] = editorLabels(mode);
  const form = formForEditor(mode);
  els.skillForm.hidden = form !== els.skillForm;
  els.projectForm.hidden = form !== els.projectForm;
  els.certificateForm.hidden = form !== els.certificateForm;
  els.editorEyebrow.textContent = eyebrow;
  els.editorTitle.textContent = title;
  els.skillSubmitBtn.textContent = button;
  els.projectSubmitBtn.textContent = button;
  els.certificateSubmitBtn.textContent = button;
  els.skillParent.required = mode === "subskill";
  els.skillParentLabel.textContent = mode === "subskill" ? "Parent skill required" : "Parent skill";
}

function updateDetails() {
  const node = findNode(state.activeNodeId) || state.profileNode;
  const editable = selectedEditableNode();
  els.selectionActions.hidden = !editable;

  if (node.type === "profile") {
    els.detailsTitle.textContent = node.title;
    els.detailsCopy.textContent = state.skills.length
      ? `${rootSkills().length} root skill${rootSkills().length === 1 ? "" : "s"} connected to this profile.`
      : "Add your first skill to begin.";
    els.detailsChips.innerHTML = rootSkills().map((skill) => chipMarkup(skill.title, skill.color)).join("");
    return;
  }

  if (node.type === "skill") {
    const projects = projectsForSkill(node.id);
    const certs = certificatesForSkill(node.id);
    const subskills = skillChildren(node.id);
    els.detailsTitle.textContent = node.title;
    els.detailsCopy.textContent = `${node.subtitle || "Skill"} with ${projects.length} project${projects.length === 1 ? "" : "s"}, ${certs.length} certificate${certs.length === 1 ? "" : "s"}, and ${subskills.length} sub skill${subskills.length === 1 ? "" : "s"}.`;
    els.detailsChips.innerHTML = [
      ...subskills.map((skill) => chipMarkup(skill.title, skill.color)),
      ...projects.map((project) => chipMarkup(project.title, projectAccent(project))),
      ...certs.map((cert) => chipMarkup(cert.title, certificateAccent(cert))),
    ].join("");
    return;
  }

  if (node.type === "category") {
    els.detailsTitle.textContent = node.title;
    els.detailsCopy.textContent =
      node.kind === "projects" ? "Open this branch to see projects using the skill." : "Open this branch to see PDF certificates.";
    els.detailsChips.innerHTML = "";
    return;
  }

  if (node.type === "certificate") {
    const skill = findSkillById(node.skillId);
    els.detailsTitle.textContent = node.title;
    els.detailsCopy.textContent = `${node.issuer || "Certificate"}${node.pdfUrl ? " with PDF attached." : "."}`;
    els.detailsChips.innerHTML = skill ? chipMarkup(skill.title, skill.color) : "";
    return;
  }

  const skills = node.skillIds.map(findSkillById).filter(Boolean);
  els.detailsTitle.textContent = node.title;
  els.detailsCopy.textContent = `${node.preview || "Project"} ${node.summary || ""}`.trim();
  els.detailsChips.innerHTML = skills.map((skill) => chipMarkup(skill.title, skill.color)).join("");
}

function updateDetailCard() {
  const project = findProjectById(state.activeProjectId);
  const certificate = findCertificateById(state.activeCertificateId);
  const item = project || certificate;

  if (!item) {
    els.projectDetailCard.hidden = true;
    return;
  }

  const accent = project ? projectAccent(project) : certificateAccent(certificate);
  els.projectDetailCard.style.setProperty("--project-color", accent);
  els.detailEyebrow.textContent = project ? "Project" : "Certificate";
  els.projectDetailTitle.textContent = item.title;
  els.projectDetailPreview.textContent = project ? project.preview || "Project preview" : item.issuer || "Certificate issuer";
  els.projectDetailDescription.textContent = project ? item.summary || "No description added yet." : "Click open to view the certificate PDF.";

  const link = project ? item.link : item.pdfUrl;
  if (link) {
    els.projectDetailLink.hidden = false;
    els.projectDetailLink.href = link;
    els.projectDetailLink.textContent = project ? "Open project" : "Open PDF";
  } else {
    els.projectDetailLink.hidden = true;
    els.projectDetailLink.removeAttribute("href");
  }

  els.projectDetailCard.hidden = false;
}

function updateConnectStatus() {
  els.connectBtn.classList.toggle("is-active", state.connectMode);
  els.connectBtn.setAttribute("aria-pressed", String(state.connectMode));
  els.cutBtn.classList.toggle("is-active", state.cutMode);
  els.cutBtn.setAttribute("aria-pressed", String(state.cutMode));
  els.canvas.classList.toggle("cut-mode", state.cutMode);

  if (!state.connectMode && !state.cutMode) {
    els.connectStatus.hidden = true;
    return;
  }

  els.connectStatus.hidden = false;
  if (state.cutMode) {
    const source = state.cutSource ? findNode(state.cutSource) : null;
    els.connectStatus.textContent = source ? `Cut a path from ${source.title}` : "Select a node or path to cut";
    return;
  }

  const source = state.connectSource ? findNode(state.connectSource) : null;
  els.connectStatus.textContent = source ? `Connect ${source.title} to another node` : "Select a node to start a connection";
}

function updateProMode() {
  document.body.classList.toggle("pro-mode", state.proMode);
  els.proModeBtn.classList.toggle("is-active", state.proMode);
  els.proModeBtn.setAttribute("aria-pressed", String(state.proMode));
  if (!state.proMode) state.proDrawerOpen = false;
  els.proDrawer.hidden = !state.proMode || !state.proDrawerOpen;
  els.proMenuBtn.setAttribute("aria-expanded", String(state.proDrawerOpen));
}

function updateProfilePreview() {
  els.profileId.value = state.profileId;
  els.profileName.value = state.profile.name === "Your Profile" ? "" : state.profile.name;
  const initials = getInitials(state.profile.name);
  els.profilePreview.classList.toggle("is-empty", state.skills.length === 0 && state.projects.length === 0);
  els.profilePreview.innerHTML = `
    <span class="preview-initials">${escapeHtml(initials)}</span>
    <div>
      <strong>${escapeHtml(state.profile.name)}</strong>
      <p>${state.skills.length} skills, ${state.projects.length} projects, ${state.certificates.length} certs</p>
    </div>
  `;
}

function getInitials(name) {
  const letter = String(name)
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .find(Boolean);
  return (letter || "S").toUpperCase();
}

function render() {
  renderNodes();
  drawEdges();
  updateEditorControls();
  updateSkillOptions();
  updateStats();
  updateDetails();
  updateDetailCard();
  updateConnectStatus();
  updateProMode();
  updateProfilePreview();
}

function makeUniqueId(prefix, title) {
  let id = `${prefix}-${slugify(title)}`;
  let suffix = 2;
  while (findNode(id)) {
    id = `${prefix}-${slugify(title)}-${suffix}`;
    suffix += 1;
  }
  return id;
}

function addSkillFromName(name, focus = "", color = "", parentSkillId = undefined, branches = {}) {
  const existing = findSkillByName(name);
  if (existing) {
    if (focus && !existing.subtitle) existing.subtitle = focus;
    if (parentSkillId !== undefined) existing.parentSkillId = parentSkillId || "";
    if (branches.showProjectBranch) existing.showProjectBranch = true;
    if (branches.showCertificateBranch) existing.showCertificateBranch = true;
    existing.kicker = existing.parentSkillId ? "Sub skill" : "Skill";
    return existing;
  }

  const skill = {
    id: makeUniqueId("skill", name),
    type: "skill",
    title: name,
    subtitle: focus || "Skill",
    kicker: parentSkillId ? "Sub skill" : "Skill",
    color: color || palette[state.skills.length % palette.length],
    parentSkillId: parentSkillId || "",
    showProjectBranch: Boolean(branches.showProjectBranch),
    showCertificateBranch: Boolean(branches.showCertificateBranch),
    x: 0,
    y: 0,
  };

  state.skills.push(skill);
  return skill;
}

function skillIdsFromNames(value) {
  return parseList(value).map(
    (name, index) =>
      addSkillFromName(name, "Project skill", palette[(state.skills.length + index) % palette.length], undefined, {
        showProjectBranch: true,
      }).id,
  );
}

function addProject(name, skillNames, preview, summary, link) {
  const skillIds = skillIdsFromNames(skillNames);
  skillIds.forEach((skillId) => {
    const skill = findSkillById(skillId);
    if (skill) skill.showProjectBranch = true;
  });
  const project = {
    id: makeUniqueId("project", name),
    type: "project",
    title: name,
    subtitle: `${skillIds.length} skill${skillIds.length === 1 ? "" : "s"}`,
    kicker: "Project",
    skillIds,
    preview: preview || "Project preview",
    summary: summary || "Project description",
    link: link || "",
    x: 0,
    y: 0,
  };
  state.projects.push(project);
  return project;
}

function addCertificate(title, skillId, issuer, pdfUrl) {
  const skill = findSkillById(skillId);
  if (skill) skill.showCertificateBranch = true;
  const certificate = {
    id: makeUniqueId("certificate", title),
    type: "certificate",
    title,
    subtitle: issuer || "Certificate",
    kicker: "PDF",
    skillId: skill ? skill.id : "",
    issuer: issuer || "",
    pdfUrl: pdfUrl || "",
    color: skill ? skill.color : "#ffd15f",
    x: 0,
    y: 0,
  };
  state.certificates.push(certificate);
  return certificate;
}

function resetModes() {
  state.connectMode = false;
  state.connectSource = null;
  state.cutMode = false;
  state.cutSource = null;
}

function handleProfileSubmit(event) {
  event.preventDefault();
  state.profileId = slugify(els.profileId.value || "default");
  state.profile.name = els.profileName.value.trim() || "Your Profile";
  state.profileNode.title = state.profile.name;
  state.profileNode.subtitle = "Stored locally";
  state.activeNodeId = "profile";
  state.activeProjectId = null;
  state.activeCertificateId = null;
  render();
  saveNow();
}

function handleSkillSubmit(event) {
  event.preventDefault();
  const name = els.skillName.value.trim();
  if (!name) {
    els.skillName.focus();
    return;
  }

  const mode = state.editorMode;
  const parentSkillId = els.skillParent.value;
  if (mode === "subskill" && !parentSkillId) {
    els.skillParent.focus();
    return;
  }

  if (mode === "edit-skill") {
    const skill = findSkillById(state.editingId);
    if (!skill) return;
    if (parentSkillId === skill.id || (parentSkillId && wouldCreateCycle(parentSkillId, skill.id))) {
      els.skillParent.focus();
      return;
    }

    skill.title = name;
    skill.subtitle = els.skillFocus.value.trim() || "Skill";
    skill.color = els.skillColor.value;
    skill.parentSkillId = parentSkillId || "";
    skill.kicker = skill.parentSkillId ? "Sub skill" : "Skill";
    skill.showProjectBranch = els.skillProjectBranch.checked;
    skill.showCertificateBranch = els.skillCertificateBranch.checked;
    if (skill.parentSkillId) state.expandedSkills.add(skill.parentSkillId);
    state.activeNodeId = skill.id;
    state.activeProjectId = null;
    state.activeCertificateId = null;
    arrangeGraph(false);
    fitGraph();
    queueSave();
    return;
  }

  const skill = addSkillFromName(name, els.skillFocus.value.trim(), els.skillColor.value, parentSkillId, {
    showProjectBranch: els.skillProjectBranch.checked,
    showCertificateBranch: els.skillCertificateBranch.checked,
  });
  if (skill.parentSkillId) state.expandedSkills.add(skill.parentSkillId);
  state.activeNodeId = skill.id;
  state.activeProjectId = null;
  state.activeCertificateId = null;
  els.skillForm.reset();
  els.skillColor.value = palette[state.skills.length % palette.length];
  arrangeGraph(false);
  fitGraph();
  queueSave();
}

function handleProjectSubmit(event) {
  event.preventDefault();
  const name = els.projectName.value.trim();
  if (!name) {
    els.projectName.focus();
    return;
  }

  let project = null;
  if (state.editorMode === "edit-project") {
    project = findProjectById(state.editingId);
    if (!project) return;
    project.title = name;
    project.skillIds = skillIdsFromNames(els.projectSkills.value);
    project.skillIds.forEach((skillId) => {
      const skill = findSkillById(skillId);
      if (skill) skill.showProjectBranch = true;
    });
    project.subtitle = `${project.skillIds.length} skill${project.skillIds.length === 1 ? "" : "s"}`;
    project.preview = els.projectPreview.value.trim() || "Project preview";
    project.summary = els.projectSummary.value.trim() || "Project description";
    project.link = els.projectLink.value.trim();
  } else {
    project = addProject(name, els.projectSkills.value, els.projectPreview.value.trim(), els.projectSummary.value.trim(), els.projectLink.value.trim());
  }

  project.skillIds.forEach((skillId) => {
    state.expandedSkills.add(skillId);
    state.expandedBuckets.add(bucketKey("projects", skillId));
  });
  state.activeNodeId = project.id;
  state.activeProjectId = project.id;
  state.activeCertificateId = null;
  if (state.editorMode !== "edit-project") els.projectForm.reset();
  arrangeGraph(false);
  fitGraph();
  queueSave();
}

function handleCertificateSubmit(event) {
  event.preventDefault();
  const title = els.certificateName.value.trim();
  if (!title) {
    els.certificateName.focus();
    return;
  }
  let certificate = null;
  if (state.editorMode === "edit-certificate") {
    certificate = findCertificateById(state.editingId);
    if (!certificate) return;
    const skill = findSkillById(els.certificateSkill.value);
    certificate.title = title;
    certificate.skillId = skill ? skill.id : "";
    if (skill) skill.showCertificateBranch = true;
    certificate.issuer = els.certificateIssuer.value.trim();
    certificate.subtitle = certificate.issuer || "Certificate";
    certificate.pdfUrl = els.certificatePdf.value.trim();
    certificate.color = skill ? skill.color : "#ffd15f";
  } else {
    certificate = addCertificate(title, els.certificateSkill.value, els.certificateIssuer.value.trim(), els.certificatePdf.value.trim());
  }

  if (certificate.skillId) {
    state.expandedSkills.add(certificate.skillId);
    state.expandedBuckets.add(bucketKey("certificates", certificate.skillId));
  }
  state.activeNodeId = certificate.id;
  state.activeCertificateId = certificate.id;
  state.activeProjectId = null;
  if (state.editorMode !== "edit-certificate") els.certificateForm.reset();
  arrangeGraph(false);
  fitGraph();
  queueSave();
}

function returnForms() {
  formOrder.forEach((form) => {
    if (form.parentElement !== formHome) {
      formHome.appendChild(form);
    }
  });
}

function showEditor(mode) {
  resetModes();
  returnForms();
  state.editorMode = mode;
  state.editingId = null;
  resetFormForMode(mode);
  render();
  populateEditorForm();
}

function openToolModal(mode, editingId = null) {
  resetModes();
  returnForms();
  state.editorMode = mode;
  state.editingId = editingId;
  if (!editingId) resetFormForMode(mode);
  render();
  populateEditorForm();
  const form = formForEditor(mode);
  const [, title] = editorLabels(mode);
  els.modalEyebrow.textContent = "Pro mode";
  els.modalTitle.textContent = title;
  els.modalFormMount.appendChild(form);
  form.hidden = false;
  els.toolModal.hidden = false;
  state.proDrawerOpen = false;
  updateProMode();
  requestAnimationFrame(() => {
    const input = form.querySelector("input, select, textarea");
    if (input) input.focus();
  });
}

function closeToolModal() {
  els.toolModal.hidden = true;
  returnForms();
}

function editSelectedNode() {
  const node = selectedEditableNode();
  if (!node) return;
  const mode = node.type === "skill" ? "edit-skill" : node.type === "project" ? "edit-project" : "edit-certificate";
  if (state.proMode) openToolModal(mode, node.id);
  else {
    state.editorMode = mode;
    state.editingId = node.id;
    returnForms();
    render();
    populateEditorForm();
  }
}

function pruneEdgesFor(removedIds) {
  state.customEdges = state.customEdges.filter((edge) => !removedIds.has(edge.source) && !removedIds.has(edge.target));
  state.cutEdges = new Set(
    [...state.cutEdges].filter((key) => {
      const [source, target] = key.split("->");
      return !removedIds.has(source) && !removedIds.has(target);
    }),
  );
}

function pruneBucketsFor(skillIds) {
  skillIds.forEach((skillId) => {
    state.expandedSkills.delete(skillId);
    state.expandedBuckets.delete(bucketKey("projects", skillId));
    state.expandedBuckets.delete(bucketKey("certificates", skillId));
    state.categoryNodes.delete(categoryId("projects", skillId));
    state.categoryNodes.delete(categoryId("certificates", skillId));
  });
}

function deleteSkill(skillId) {
  const skillIds = new Set([skillId, ...descendantSkillIds(skillId)]);
  const removedProjectIds = new Set();
  const removedCertificateIds = new Set();

  state.skills = state.skills.filter((skill) => !skillIds.has(skill.id));
  state.projects.forEach((project) => {
    project.skillIds = project.skillIds.filter((id) => !skillIds.has(id));
    project.subtitle = `${project.skillIds.length} skill${project.skillIds.length === 1 ? "" : "s"}`;
    if (!project.skillIds.length) removedProjectIds.add(project.id);
  });
  state.projects = state.projects.filter((project) => !removedProjectIds.has(project.id));
  state.certificates.forEach((certificate) => {
    if (skillIds.has(certificate.skillId)) removedCertificateIds.add(certificate.id);
  });
  state.certificates = state.certificates.filter((certificate) => !removedCertificateIds.has(certificate.id));

  pruneBucketsFor(skillIds);
  const removedCategoryIds = [...skillIds].flatMap((id) => [categoryId("projects", id), categoryId("certificates", id)]);
  pruneEdgesFor(new Set([...skillIds, ...removedCategoryIds, ...removedProjectIds, ...removedCertificateIds]));
}

function deleteProject(projectId) {
  state.projects = state.projects.filter((project) => project.id !== projectId);
  pruneEdgesFor(new Set([projectId]));
}

function deleteCertificate(certificateId) {
  state.certificates = state.certificates.filter((certificate) => certificate.id !== certificateId);
  pruneEdgesFor(new Set([certificateId]));
}

function deleteSelectedNode() {
  const node = selectedEditableNode();
  if (!node) return;
  const confirmed = window.confirm(`Delete "${node.title}" from SkillTree?`);
  if (!confirmed) return;

  if (node.type === "skill") deleteSkill(node.id);
  if (node.type === "project") deleteProject(node.id);
  if (node.type === "certificate") deleteCertificate(node.id);

  state.activeNodeId = "profile";
  state.activeProjectId = null;
  state.activeCertificateId = null;
  state.editingId = null;
  closeToolModal();
  arrangeGraph(false);
  fitGraph();
  queueSave();
}

function clearCutBetween(source, target) {
  state.cutEdges.delete(`${source}->${target}`);
  state.cutEdges.delete(`${target}->${source}`);
}

function connectionExists(source, target) {
  return state.customEdges.some((edge) => edgeMatches(edge, source, target));
}

function wouldCreateCycle(parentId, childId) {
  let current = parentId;
  while (current) {
    if (current === childId) return true;
    current = findSkillById(current)?.parentSkillId || "";
  }
  return false;
}

function updateRelationship(source, target) {
  const sourceNode = findNode(source);
  const targetNode = findNode(target);
  if (!sourceNode || !targetNode || sourceNode.type === "category" || targetNode.type === "category") return false;

  if (sourceNode.type === "profile" && targetNode.type === "skill") {
    targetNode.parentSkillId = "";
    targetNode.kicker = "Skill";
    clearCutBetween("profile", targetNode.id);
    return true;
  }

  if (sourceNode.type === "skill" && targetNode.type === "skill" && !wouldCreateCycle(sourceNode.id, targetNode.id)) {
    targetNode.parentSkillId = sourceNode.id;
    targetNode.kicker = "Sub skill";
    state.expandedSkills.add(sourceNode.id);
    clearCutBetween(sourceNode.id, targetNode.id);
    return true;
  }

  const project = sourceNode.type === "project" ? sourceNode : targetNode.type === "project" ? targetNode : null;
  const skill = sourceNode.type === "skill" ? sourceNode : targetNode.type === "skill" ? targetNode : null;
  if (project && skill) {
    if (!project.skillIds.includes(skill.id)) project.skillIds.push(skill.id);
    project.subtitle = `${project.skillIds.length} skill${project.skillIds.length === 1 ? "" : "s"}`;
    state.expandedSkills.add(skill.id);
    state.expandedBuckets.add(bucketKey("projects", skill.id));
    clearCutBetween(categoryId("projects", skill.id), project.id);
    return true;
  }

  const certificate = sourceNode.type === "certificate" ? sourceNode : targetNode.type === "certificate" ? targetNode : null;
  if (certificate && skill) {
    certificate.skillId = skill.id;
    certificate.color = skill.color;
    state.expandedSkills.add(skill.id);
    state.expandedBuckets.add(bucketKey("certificates", skill.id));
    clearCutBetween(categoryId("certificates", skill.id), certificate.id);
    return true;
  }

  return false;
}

function handleConnectClick(nodeId) {
  if (!state.connectSource) {
    state.connectSource = nodeId;
    state.activeNodeId = nodeId;
    render();
    return;
  }

  if (state.connectSource === nodeId) {
    state.connectSource = null;
    render();
    return;
  }

  const natural = naturalEdgeBetween(state.connectSource, nodeId);
  if (natural) {
    clearCutBetween(natural.source, natural.target);
  } else if (!updateRelationship(state.connectSource, nodeId) && !connectionExists(state.connectSource, nodeId)) {
    state.customEdges.push({ source: state.connectSource, target: nodeId });
  }

  state.activeNodeId = nodeId;
  state.connectMode = false;
  state.connectSource = null;
  arrangeGraph(false);
  queueSave();
}

function cutEdge(source, target, type) {
  if (!source || !target) return;
  if (type === "custom") {
    state.customEdges = state.customEdges.filter((edge) => !edgeMatches(edge, source, target));
  } else {
    state.cutEdges.add(`${source}->${target}`);
  }
  render();
  queueSave();
}

function findVisibleEdgeBetween(source, target) {
  return edgeList().find((edge) => edgeMatches(edge, source, target));
}

function handleCutClick(nodeId) {
  if (!state.cutSource) {
    state.cutSource = nodeId;
    state.activeNodeId = nodeId;
    render();
    return;
  }

  if (state.cutSource === nodeId) {
    state.cutSource = null;
    render();
    return;
  }

  const edge = findVisibleEdgeBetween(state.cutSource, nodeId);
  if (edge) cutEdge(edge.source, edge.target, edge.type);
  state.activeNodeId = nodeId;
  state.cutMode = false;
  state.cutSource = null;
  render();
}

function handleNodeClick(nodeId) {
  if (state.suppressClickId === nodeId) {
    state.suppressClickId = null;
    return;
  }

  const node = findNode(nodeId);
  if (!node) return;

  if (state.connectMode) {
    handleConnectClick(nodeId);
    return;
  }

  if (state.cutMode) {
    handleCutClick(nodeId);
    return;
  }

  state.activeNodeId = nodeId;
  state.activeProjectId = null;
  state.activeCertificateId = null;

  if (node.type === "skill") {
    if (state.expandedSkills.has(node.id)) {
      state.expandedSkills.delete(node.id);
    } else {
      state.expandedSkills.add(node.id);
    }
    arrangeGraph(false);
    return;
  }

  if (node.type === "category") {
    const key = bucketKey(node.kind, node.skillId);
    if (state.expandedBuckets.has(key)) state.expandedBuckets.delete(key);
    else state.expandedBuckets.add(key);
    arrangeGraph(false);
    return;
  }

  if (node.type === "project") {
    state.activeProjectId = node.id;
  }

  if (node.type === "certificate") {
    state.activeCertificateId = node.id;
    if (node.pdfUrl) window.open(node.pdfUrl, "_blank", "noreferrer");
  }

  render();
}

function updateDraggedNode(node, pointerEvent) {
  const pointer = worldPoint(pointerEvent);
  node.x = clamp(dragState.originX + pointer.x - dragState.startWorldX, 80, WORLD.width - 80);
  node.y = clamp(dragState.originY + pointer.y - dragState.startWorldY, 70, WORLD.height - 70);
  node.pinned = true;
  positionNodes();
  drawEdges();
}

function serializeState() {
  return {
    profileId: state.profileId,
    profile: state.profile,
    profileNode: state.profileNode,
    skills: state.skills,
    projects: state.projects,
    certificates: state.certificates,
    customEdges: state.customEdges,
    cutEdges: [...state.cutEdges],
  };
}

function normalizeLoadedProfile(data) {
  state.profileId = data.profileId || state.profileId || "default";
  state.profile = data.profile || { name: "Your Profile" };
  state.profileNode = {
    ...state.profileNode,
    ...(data.profileNode || {}),
    id: "profile",
    type: "profile",
    title: data.profile?.name || data.profileNode?.title || "Your Profile",
  };
  state.skills = Array.isArray(data.skills)
    ? data.skills.map((skill) => ({
        ...skill,
        showProjectBranch: Boolean(skill.showProjectBranch),
        showCertificateBranch: Boolean(skill.showCertificateBranch),
      }))
    : [];
  state.projects = Array.isArray(data.projects) ? data.projects.map((project) => ({ ...project, skillIds: project.skillIds || (project.parent ? [project.parent] : []) })) : [];
  state.certificates = Array.isArray(data.certificates) ? data.certificates : [];
  state.customEdges = Array.isArray(data.customEdges) ? data.customEdges : [];
  state.cutEdges = new Set(Array.isArray(data.cutEdges) ? data.cutEdges : []);
  state.expandedSkills = new Set();
  state.expandedBuckets = new Set();
  state.categoryNodes = new Map();
  state.activeNodeId = "profile";
  state.activeProjectId = null;
  state.activeCertificateId = null;
}

async function loadProfile(profileId = state.profileId) {
  loadingProfile = true;
  try {
    const id = slugify(profileId || "default");
    const response = await fetch(`/api/profiles/${encodeURIComponent(id)}`);
    if (response.ok) {
      normalizeLoadedProfile(await response.json());
    } else {
      normalizeLoadedProfile({ profileId: id, profile: { name: "Your Profile" }, skills: [], projects: [], certificates: [] });
    }
  } catch {
    normalizeLoadedProfile({ profileId, profile: { name: "Your Profile" }, skills: [], projects: [], certificates: [] });
  } finally {
    loadingProfile = false;
    render();
    arrangeGraph(true);
    fitGraph();
  }
}

async function saveNow() {
  if (loadingProfile) return;
  window.clearTimeout(saveTimer);
  const payload = serializeState();
  try {
    await fetch(`/api/profiles/${encodeURIComponent(state.profileId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // Local storage is a graceful fallback when the backend is not reachable.
    localStorage.setItem(`skilltree:${state.profileId}`, JSON.stringify(payload));
  }
}

function queueSave() {
  if (loadingProfile) return;
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(saveNow, 450);
}

function showWorkspace(intent = "load") {
  document.body.classList.remove("home-active");
  els.homeScreen.hidden = true;
  els.appShell.hidden = false;
  closeToolModal();
  window.setTimeout(() => {
    fitGraph();
    const target = intent === "create" ? els.profileName : els.profileId;
    target.focus();
  }, 80);
}

function openAddMode(mode) {
  if (state.proMode) openToolModal(mode);
  else showEditor(mode);
}

function toggleConnectMode() {
  state.connectMode = !state.connectMode;
  state.cutMode = false;
  state.connectSource = null;
  state.cutSource = null;
  render();
}

function toggleCutMode() {
  state.cutMode = !state.cutMode;
  state.connectMode = false;
  state.connectSource = null;
  state.cutSource = null;
  render();
}

function arrangeAndFit() {
  arrangeGraph(true);
  fitGraph();
}

function toggleProMode(force) {
  state.proMode = typeof force === "boolean" ? force : !state.proMode;
  if (!state.proMode) {
    state.proDrawerOpen = false;
    closeToolModal();
  }
  render();
  window.setTimeout(fitGraph, 80);
}

function toggleProDrawer(force) {
  if (!state.proMode) return;
  state.proDrawerOpen = typeof force === "boolean" ? force : !state.proDrawerOpen;
  updateProMode();
}

function selectDetailItem() {
  if (state.activeProjectId) state.activeNodeId = state.activeProjectId;
  if (state.activeCertificateId) state.activeNodeId = state.activeCertificateId;
}

function handleProAction(action) {
  if (action === "skill" || action === "subskill" || action === "project" || action === "certificate") openToolModal(action);
  if (action === "connect") toggleConnectMode();
  if (action === "cut") toggleCutMode();
  if (action === "arrange") arrangeAndFit();
  if (action === "edit") editSelectedNode();
  if (action === "delete") deleteSelectedNode();
  if (action === "exit") toggleProMode(false);
}

function hideNodeMenu() {
  state.nodeMenuTarget = null;
  els.nodeMenu.hidden = true;
}

function openNodeMenu(nodeId, event) {
  const node = findNode(nodeId);
  if (!node || !["profile", "skill"].includes(node.type)) return;

  event.preventDefault();
  state.nodeMenuTarget = node.id;
  state.activeNodeId = node.id;
  state.activeProjectId = null;
  state.activeCertificateId = null;
  render();

  const isProfile = node.type === "profile";
  const firstAction = els.nodeMenu.querySelector('[data-node-action="subskill"]');
  const deleteAction = els.nodeMenu.querySelector('[data-node-action="delete"]');
  firstAction.textContent = isProfile ? "Add skill" : "Add subskill";
  deleteAction.hidden = isProfile;
  els.nodeMenuTitle.textContent = node.title;
  els.nodeMenu.hidden = false;

  const menuRect = els.nodeMenu.getBoundingClientRect();
  const left = clamp(event.clientX, 12, window.innerWidth - menuRect.width - 12);
  const top = clamp(event.clientY, 72, window.innerHeight - menuRect.height - 12);
  els.nodeMenu.style.left = `${left}px`;
  els.nodeMenu.style.top = `${top}px`;
}

function prefillNodeAction(action, node) {
  if (action === "project" && node?.type === "skill") {
    els.projectSkills.value = node.title;
  }
  if (action === "certificate" && node?.type === "skill") {
    els.certificateSkill.value = node.id;
  }
}

function handleNodeMenuAction(action) {
  const node = findNode(state.nodeMenuTarget);
  if (!node) return;
  state.activeNodeId = node.id;
  hideNodeMenu();

  if (action === "delete") {
    deleteSelectedNode();
    return;
  }

  if (action === "subskill") {
    openAddMode(node.type === "profile" ? "skill" : "subskill");
    return;
  }

  if (action === "project" || action === "certificate") {
    openAddMode(action);
    prefillNodeAction(action, node);
  }
}

els.nodeLayer.addEventListener("click", (event) => {
  const button = event.target.closest(".graph-node");
  if (!button) return;
  handleNodeClick(button.dataset.nodeId);
});

els.nodeLayer.addEventListener("contextmenu", (event) => {
  const button = event.target.closest(".graph-node");
  if (!button) return;
  openNodeMenu(button.dataset.nodeId, event);
});

els.edgeGroup.addEventListener("click", (event) => {
  if (!state.cutMode) return;
  const path = event.target.closest(".edge-path, .edge-hit");
  if (!path) return;
  event.stopPropagation();
  cutEdge(path.dataset.source, path.dataset.target, path.dataset.type);
});

els.nodeLayer.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  const button = event.target.closest(".graph-node");
  if (!button) return;
  const node = findNode(button.dataset.nodeId);
  if (!node) return;

  const pointer = worldPoint(event);
  dragState = {
    id: node.id,
    startClientX: event.clientX,
    startClientY: event.clientY,
    startWorldX: pointer.x,
    startWorldY: pointer.y,
    originX: node.x,
    originY: node.y,
    moved: false,
  };

  button.classList.add("is-dragging");
  button.setPointerCapture(event.pointerId);
});

els.nodeLayer.addEventListener("pointermove", (event) => {
  if (!dragState) return;
  const node = findNode(dragState.id);
  if (!node) return;

  if (Math.abs(event.clientX - dragState.startClientX) > 3 || Math.abs(event.clientY - dragState.startClientY) > 3) {
    dragState.moved = true;
    updateDraggedNode(node, event);
  }
});

function finishDrag(event) {
  if (!dragState) return;
  const button = els.nodeLayer.querySelector(`[data-node-id="${CSS.escape(dragState.id)}"]`);
  if (button) {
    button.classList.remove("is-dragging");
    if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);
  }

  if (dragState.moved) {
    state.suppressClickId = dragState.id;
    window.setTimeout(() => {
      if (state.suppressClickId === dragState.id) state.suppressClickId = null;
    }, 220);
    queueSave();
  }
  dragState = null;
}

els.nodeLayer.addEventListener("pointerup", finishDrag);
els.nodeLayer.addEventListener("pointercancel", finishDrag);

els.canvas.addEventListener("pointerdown", (event) => {
  if (state.cutMode) return;
  if (event.target.closest(".graph-node")) return;
  panState = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    originX: state.view.x,
    originY: state.view.y,
  };
  els.canvas.classList.add("is-panning");
  els.canvas.setPointerCapture(event.pointerId);
});

els.canvas.addEventListener("pointermove", (event) => {
  if (!panState) return;
  state.view.x = panState.originX + event.clientX - panState.startX;
  state.view.y = panState.originY + event.clientY - panState.startY;
  applyViewport();
});

function finishPan(event) {
  if (!panState) return;
  els.canvas.classList.remove("is-panning");
  if (els.canvas.hasPointerCapture(event.pointerId)) els.canvas.releasePointerCapture(event.pointerId);
  panState = null;
}

els.canvas.addEventListener("pointerup", finishPan);
els.canvas.addEventListener("pointercancel", finishPan);
els.canvas.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();
    zoomAt(canvasPoint(event), event.deltaY < 0 ? 1.11 : 0.9);
  },
  { passive: false },
);

els.profileForm.addEventListener("submit", handleProfileSubmit);
els.loadProfileBtn.addEventListener("click", () => loadProfile(els.profileId.value || "default"));
els.skillForm.addEventListener("submit", handleSkillSubmit);
els.projectForm.addEventListener("submit", handleProjectSubmit);
els.certificateForm.addEventListener("submit", handleCertificateSubmit);
els.homeLoadProfileBtn.addEventListener("click", () => showWorkspace("load"));
els.homeCreateProfileBtn.addEventListener("click", () => showWorkspace("create"));

els.addSkillBtn.addEventListener("click", () => openAddMode("skill"));
els.addSubskillBtn.addEventListener("click", () => openAddMode("subskill"));
els.addProjectBtn.addEventListener("click", () => openAddMode("project"));
els.addCertificateBtn.addEventListener("click", () => openAddMode("certificate"));
els.zoomOutBtn.addEventListener("click", () => zoomAtCenter(0.86));
els.zoomInBtn.addEventListener("click", () => zoomAtCenter(1.16));
els.connectBtn.addEventListener("click", toggleConnectMode);
els.cutBtn.addEventListener("click", toggleCutMode);
els.arrangeBtn.addEventListener("click", arrangeAndFit);
els.proModeBtn.addEventListener("click", () => toggleProMode());
els.proMenuBtn.addEventListener("click", () => toggleProDrawer());
els.closeProDrawerBtn.addEventListener("click", () => toggleProDrawer(false));
els.proDrawer.addEventListener("click", (event) => {
  const button = event.target.closest("[data-pro-action]");
  if (!button) return;
  handleProAction(button.dataset.proAction);
});
els.nodeMenu.addEventListener("click", (event) => {
  event.stopPropagation();
  const button = event.target.closest("[data-node-action]");
  if (!button) return;
  handleNodeMenuAction(button.dataset.nodeAction);
});
els.editSelectedBtn.addEventListener("click", editSelectedNode);
els.deleteSelectedBtn.addEventListener("click", deleteSelectedNode);
els.closeModalBtn.addEventListener("click", closeToolModal);
els.toolModal.addEventListener("click", (event) => {
  if (event.target === els.toolModal) closeToolModal();
});
els.closeProjectDetailBtn.addEventListener("click", () => {
  state.activeProjectId = null;
  state.activeCertificateId = null;
  render();
});
els.editDetailBtn.addEventListener("click", () => {
  selectDetailItem();
  editSelectedNode();
});
els.deleteDetailBtn.addEventListener("click", () => {
  selectDetailItem();
  deleteSelectedNode();
});
window.addEventListener("resize", () => {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(fitGraph, 120);
});
window.addEventListener("click", (event) => {
  if (!event.target.closest("#nodeMenu")) hideNodeMenu();
});
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    hideNodeMenu();
    toggleProDrawer(false);
  }
});

window.setTimeout(() => {
  document.body.classList.add("is-loaded");
}, 1650);

showEditor("skill");
loadProfile("default");
