import re
from typing import List, Dict, Any
from backend.app.agent_core.providers.base import BaseModelProvider, ProviderStepResponse, ToolCallRequest

class DeterministicProvider(BaseModelProvider):
    """
    Zero-Cost Intelligent Local Fallback Engine.
    Enables complete out-of-the-box agent workflows, real tool invocations, 
    and multi-step reasoning without requiring paid API keys or external services.
    """

    async def generate_step(
        self,
        messages: List[Dict[str, Any]],
        tools: List[Dict[str, Any]]
    ) -> ProviderStepResponse:
        # Check if the last message is a tool output
        last_message = messages[-1] if messages else {}
        
        if last_message.get("role") == "tool":
            tool_name = last_message.get("name", "tool")
            content = last_message.get("content", {})
            return ProviderStepResponse(
                thought=f"Tool '{tool_name}' execution completed with output: {str(content)[:200]}... Synthesizing final mission report.",
                tool_call=None,
                final_response=self._format_final_response(tool_name, content),
                is_done=True
            )

        # Extract the user prompt from messages
        user_prompt = ""
        for m in reversed(messages):
            if m.get("role") == "user":
                user_prompt = m.get("content", "").lower()
                break

        # Match intent to tools
        # 1. Python sandbox execution
        if any(k in user_prompt for k in ["python", "code", "run script", "execute", "fibonacci", "prime", "algorithm", "sort"]):
            # Extract code or construct an appropriate Python algorithm based on prompt
            if "fibonacci" in user_prompt:
                py_code = (
                    "def fib(n):\n"
                    "    a, b = 0, 1\n"
                    "    res = []\n"
                    "    for _ in range(n):\n"
                    "        res.append(a)\n"
                    "        a, b = b, a + b\n"
                    "    return res\n\n"
                    "print('Grand Line Navigation Matrix: Fibonacci(15)')\n"
                    "print(fib(15))\n"
                )
            elif "prime" in user_prompt:
                py_code = (
                    "def primes_up_to(n):\n"
                    "    primes = []\n"
                    "    for num in range(2, n + 1):\n"
                    "        if all(num % i != 0 for i in range(2, int(num**0.5) + 1)):\n"
                    "            primes.append(num)\n"
                    "    return primes\n\n"
                    "print('Primes under 50 for Cipher Encryption:')\n"
                    "print(primes_up_to(50))\n"
                )
            elif "```python" in user_prompt or "```" in user_prompt:
                # Extract embedded code block
                matches = re.findall(r"```(?:python)?(.*?)```", user_prompt, re.DOTALL)
                py_code = matches[0].strip() if matches else "print('Executing sandbox diagnostic')"
            else:
                py_code = (
                    "import math, sys\n"
                    "print('== Grand Line Workshop Engineering Diagnostic ==')\n"
                    "print(f'Python runtime: {sys.version.split()[0]}')\n"
                    "coordinates = [(x, math.sin(x/5) * 10) for x in range(5)]\n"
                    "print(f'Computed Waypoints: {coordinates}')\n"
                )
            
            return ProviderStepResponse(
                thought="User requested Python execution. This is a HIGH risk operation requiring Captain Authorization before running in the sandbox.",
                tool_call=ToolCallRequest(
                    tool_name="python_exec",
                    arguments={"code": py_code, "filename": "mission_script.py"}
                ),
                is_done=False
            )

        # 2. System status / hardware diagnostics
        if any(k in user_prompt for k in ["system", "status", "cpu", "ram", "memory", "specs", "health", "metrics"]):
            return ProviderStepResponse(
                thought="User requested system metrics. Invoking safe 'system_status' tool to query hardware and operating system telemetry.",
                tool_call=ToolCallRequest(
                    tool_name="system_status",
                    arguments={}
                ),
                is_done=False
            )

        # 3. Calculation / math
        if any(k in user_prompt for k in ["calculate", "math", "+", "-", "*", "/", "expression"]) and re.search(r"\d", user_prompt):
            # Extract expression
            math_match = re.search(r"([\d\.\s\+\-\*\/\(\)\^%]+)", user_prompt)
            expr = math_match.group(1).strip() if math_match else "42 * 1337"
            return ProviderStepResponse(
                thought=f"Detected mathematical calculation request. Invoking 'calculator' tool with expression: '{expr}'.",
                tool_call=ToolCallRequest(
                    tool_name="calculator",
                    arguments={"expression": expr}
                ),
                is_done=False
            )

        # 4. File write / create file
        if any(k in user_prompt for k in ["write", "create file", "save to file", "save log"]):
            filename = "mission_log.txt"
            content = "Log Entry: Grand Line Command Center operational. All sectors green."
            name_match = re.search(r"['\"]([a-zA-Z0-9_\-\.]+\.[a-zA-Z0-9]+)['\"]", user_prompt)
            if name_match:
                filename = name_match.group(1)
            
            return ProviderStepResponse(
                thought=f"Request to write file '{filename}'. As a disk mutation, this requires Captain Approval.",
                tool_call=ToolCallRequest(
                    tool_name="file_write",
                    arguments={"filename": filename, "content": content}
                ),
                is_done=False
            )

        # 5. File list
        if any(k in user_prompt for k in ["list file", "dir", "ls files", "sandbox files", "show files"]):
            return ProviderStepResponse(
                thought="Inspecting sandbox workspace files with 'file_list'.",
                tool_call=ToolCallRequest(
                    tool_name="file_list",
                    arguments={}
                ),
                is_done=False
            )

        # 6. File read
        if "read" in user_prompt:
            name_match = re.search(r"['\"]([a-zA-Z0-9_\-\.]+\.[a-zA-Z0-9]+)['\"]", user_prompt)
            filename = name_match.group(1) if name_match else "mission_log.txt"
            return ProviderStepResponse(
                thought=f"Reading file '{filename}' via safe 'file_read' tool.",
                tool_call=ToolCallRequest(
                    tool_name="file_read",
                    arguments={"filename": filename}
                ),
                is_done=False
            )

        # 7. Web fetch
        if "http://" in user_prompt or "https://" in user_prompt or "web" in user_prompt or "fetch" in user_prompt:
            url_match = re.search(r"https?://[^\s]+", user_prompt)
            url = url_match.group(0) if url_match else "https://httpbin.org/get"
            return ProviderStepResponse(
                thought=f"Querying web data from {url} via 'web_fetch'.",
                tool_call=ToolCallRequest(
                    tool_name="web_fetch",
                    arguments={"url": url}
                ),
                is_done=False
            )

        # 8. Shell command
        if any(k in user_prompt for k in ["shell", "terminal", "command", "bash"]):
            return ProviderStepResponse(
                thought="Executing sandbox shell command. Requires Captain Approval.",
                tool_call=ToolCallRequest(
                    tool_name="shell_command",
                    arguments={"command": "ls -lh"}
                ),
                is_done=False
            )

        # Default conversational response
        return ProviderStepResponse(
            thought="Direct conversational inquiry without immediate tool trigger required.",
            final_response=(
                f"**Grand Line Command Center**: Message received. Station is standing by.\n\n"
                f"You can command me to execute real operations:\n"
                f"- **Inspect System**: *'Run system diagnostics and check CPU/memory'* (Safe)\n"
                f"- **Safe Math**: *'Calculate (1024 * 768) / 60'* (Safe)\n"
                f"- **Sandbox Python**: *'Run Python script calculating Fibonacci 15'* (Requires Captain Approval)\n"
                f"- **File Operations**: *'Write mission log to file'* or *'List sandbox files'* (Approval for writes)\n"
                f"- **Web Query**: *'Fetch data from https://httpbin.org/get'*"
            ),
            is_done=True
        )

    def _format_final_response(self, tool_name: str, content: Any) -> str:
        if tool_name == "system_status":
            return (
                f"### ⚓ Grand Line Telemetry Report\n\n"
                f"- **Platform**: `{content.get('platform', 'N/A')}`\n"
                f"- **CPU**: `{content.get('cpu_percent', 0)}%` ({content.get('cpu_count', 1)} cores)\n"
                f"- **Memory**: `{content.get('memory_used_gb', 0)} GB` / `{content.get('memory_total_gb', 0)} GB` ({content.get('memory_percent', 0)}% utilized)\n"
                f"- **Disk**: `{content.get('disk_free_gb', 0)} GB` free ({content.get('disk_percent', 0)}% used)\n"
                f"- **Station Health**: **All Systems Operational**"
            )
        elif tool_name == "python_exec":
            stdout = content.get("stdout", "").strip()
            stderr = content.get("stderr", "").strip()
            code = content.get("exit_code", 0)
            return (
                f"### ⚙️ Python Sandbox Execution Output\n\n"
                f"**Exit Code**: `{code}`\n\n"
                f"```text\n{stdout or '(No stdout output)'}\n```\n"
                + (f"\n**Stderr**:\n```text\n{stderr}\n```" if stderr else "")
            )
        elif tool_name == "calculator":
            return (
                f"### 🧮 Calculation Verified\n\n"
                f"**Expression**: `{content.get('expression')}`\n"
                f"**Result**: `{content.get('result')}`"
            )
        elif tool_name == "file_write":
            return (
                f"### 📜 File Written Successfully\n\n"
                f"- **Target**: `{content.get('filename')}`\n"
                f"- **Bytes Written**: `{content.get('bytes_written')}` bytes\n"
                f"- **Sandbox Path**: `workspace_sandbox/{content.get('filename')}`"
            )
        elif tool_name == "file_list":
            files = content.get("files", [])
            file_items = "\n".join([f"- `{f['name']}` ({f['size_bytes']} bytes)" for f in files]) if files else "- *(Empty directory)*"
            return f"### 📂 Sandbox Workspace Directory\n\n{file_items}"
        elif tool_name == "web_fetch":
            return (
                f"### 🌐 Web Request Succeeded\n\n"
                f"- **URL**: `{content.get('url')}`\n"
                f"- **Status Code**: `{content.get('status_code')}`\n\n"
                f"```json\n{content.get('snippet', '')[:500]}\n```"
            )
        elif tool_name == "shell_command":
            return (
                f"### 💻 Sandbox Shell Command Output\n\n"
                f"```text\n{content.get('stdout', '') or content.get('stderr', '')}\n```"
            )
        return f"Tool `{tool_name}` output:\n```json\n{content}\n```"
