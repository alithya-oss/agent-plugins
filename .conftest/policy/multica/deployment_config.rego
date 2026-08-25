package multica.deployment_config

import rego.v1

# ============================================================================
# Conftest policy for multica.deployment.config.yaml
# Validates required values and structural integrity.
#
# Run with:
#   conftest test multica.deployment.config.yaml --policy policy/multica/
# ============================================================================

# --- Top-level structure ---

deny contains msg if {
	not input.servers
	msg := "Missing required top-level key: 'servers'"
}

deny contains msg if {
	input.servers
	count(input.servers) == 0
	msg := "At least one server must be defined under 'servers'"
}

# --- Server validation ---

deny contains msg if {
	some i, server in input.servers
	not server.url
	msg := sprintf("servers[%d]: missing required field 'url'", [i])
}

deny contains msg if {
	some i, server in input.servers
	server.url
	server.url == ""
	msg := sprintf("servers[%d]: 'url' must not be empty", [i])
}

deny contains msg if {
	some i, server in input.servers
	not server.workspaces
	msg := sprintf("servers[%d] (%s): missing required field 'workspaces'", [i, server.url])
}

deny contains msg if {
	some i, server in input.servers
	server.workspaces
	count(server.workspaces) == 0
	msg := sprintf("servers[%d] (%s): at least one workspace must be defined", [i, server.url])
}

# --- Workspace validation ---

deny contains msg if {
	some i, server in input.servers
	some j, workspace in server.workspaces
	not workspace.id
	msg := sprintf("servers[%d].workspaces[%d]: missing required field 'id'", [i, j])
}

deny contains msg if {
	some i, server in input.servers
	some j, workspace in server.workspaces
	workspace.id
	workspace.id == ""
	msg := sprintf("servers[%d].workspaces[%d]: 'id' must not be empty (set a workspace UUID or use MULTICA_WORKSPACE_ID env var)", [i, j])
}

# --- Skills validation ---

deny contains msg if {
	some i, server in input.servers
	some j, workspace in server.workspaces
	workspace.skills
	not workspace.skills.sources
	msg := sprintf("servers[%d].workspaces[%d].skills: missing required field 'sources'", [i, j])
}

deny contains msg if {
	some i, server in input.servers
	some j, workspace in server.workspaces
	workspace.skills
	workspace.skills.sources
	count(workspace.skills.sources) == 0
	msg := sprintf("servers[%d].workspaces[%d].skills: 'sources' must contain at least one entry", [i, j])
}

deny contains msg if {
	some i, server in input.servers
	some j, workspace in server.workspaces
	workspace.skills
	workspace.skills.sources
	some k, source in workspace.skills.sources
	not source.plugin
	msg := sprintf("servers[%d].workspaces[%d].skills.sources[%d]: missing required field 'plugin'", [i, j, k])
}

deny contains msg if {
	some i, server in input.servers
	some j, workspace in server.workspaces
	workspace.skills
	workspace.skills.sources
	some k, source in workspace.skills.sources
	not source.skills
	msg := sprintf("servers[%d].workspaces[%d].skills.sources[%d]: missing required field 'skills'", [i, j, k])
}

deny contains msg if {
	some i, server in input.servers
	some j, workspace in server.workspaces
	workspace.skills
	workspace.skills.sources
	some k, source in workspace.skills.sources
	source.skills
	count(source.skills) == 0
	msg := sprintf("servers[%d].workspaces[%d].skills.sources[%d]: 'skills' must contain at least one entry", [i, j, k])
}

deny contains msg if {
	some i, server in input.servers
	some j, workspace in server.workspaces
	workspace.skills
	workspace.skills.on_conflict
	not workspace.skills.on_conflict in {"overwrite", "skip", "fail"}
	msg := sprintf("servers[%d].workspaces[%d].skills.on_conflict: must be one of 'overwrite', 'skip', 'fail' (got '%s')", [i, j, workspace.skills.on_conflict])
}

# --- Agents validation ---

deny contains msg if {
	some i, server in input.servers
	some j, workspace in server.workspaces
	workspace.agents
	not workspace.agents.definitions
	msg := sprintf("servers[%d].workspaces[%d].agents: missing required field 'definitions'", [i, j])
}

deny contains msg if {
	some i, server in input.servers
	some j, workspace in server.workspaces
	workspace.agents
	workspace.agents.definitions
	count(workspace.agents.definitions) == 0
	msg := sprintf("servers[%d].workspaces[%d].agents: 'definitions' must contain at least one entry", [i, j])
}

deny contains msg if {
	some i, server in input.servers
	some j, workspace in server.workspaces
	workspace.agents
	workspace.agents.definitions
	some k, agent in workspace.agents.definitions
	not agent.name
	msg := sprintf("servers[%d].workspaces[%d].agents.definitions[%d]: missing required field 'name'", [i, j, k])
}

deny contains msg if {
	some i, server in input.servers
	some j, workspace in server.workspaces
	workspace.agents
	workspace.agents.definitions
	some k, agent in workspace.agents.definitions
	agent.name
	agent.name == ""
	msg := sprintf("servers[%d].workspaces[%d].agents.definitions[%d]: 'name' must not be empty", [i, j, k])
}

deny contains msg if {
	some i, server in input.servers
	some j, workspace in server.workspaces
	workspace.agents
	workspace.agents.definitions
	some k, agent in workspace.agents.definitions
	not agent.skills
	msg := sprintf("servers[%d].workspaces[%d].agents.definitions[%d] (%s): missing required field 'skills'", [i, j, k, agent.name])
}

deny contains msg if {
	some i, server in input.servers
	some j, workspace in server.workspaces
	workspace.agents
	workspace.agents.definitions
	some k, agent in workspace.agents.definitions
	agent.skills
	count(agent.skills) == 0
	msg := sprintf("servers[%d].workspaces[%d].agents.definitions[%d] (%s): 'skills' must contain at least one entry", [i, j, k, agent.name])
}

deny contains msg if {
	some i, server in input.servers
	some j, workspace in server.workspaces
	workspace.agents
	workspace.agents.skill_binding
	not workspace.agents.skill_binding in {"additive", "replace"}
	msg := sprintf("servers[%d].workspaces[%d].agents.skill_binding: must be one of 'additive', 'replace' (got '%s')", [i, j, workspace.agents.skill_binding])
}

# --- Warnings (non-blocking) ---

warn contains msg if {
	some i, server in input.servers
	some j, workspace in server.workspaces
	not workspace.skills
	not workspace.agents
	msg := sprintf("servers[%d].workspaces[%d]: workspace has neither 'skills' nor 'agents' defined — nothing to deploy", [i, j])
}

warn contains msg if {
	some i, server in input.servers
	server.token_env
	server.token_env == ""
	msg := sprintf("servers[%d]: 'token_env' is set but empty — will fall back to MULTICA_TOKEN", [i])
}
