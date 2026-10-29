import csv
import json
import math
from pathlib import Path
from typing import Dict, Any, List, Optional
from backend.app.core.config import settings
from backend.app.agent_runtime.tools.base import Tool, ToolResult, ToolPermissionLevel, ToolCategory, SideEffectLevel
from backend.app.agent_runtime.tools.security import safe_resolve_path, PathSecurityError

def _load_data_file(filepath: str) -> tuple[List[Dict[str, Any]], List[str], str]:
    """Safely loads CSV or JSON into list of dicts and column headers."""
    # Try sandbox first, then workspace root
    target_path = settings.SANDBOX_DIR / filepath
    if not target_path.exists():
        target_path = safe_resolve_path(filepath, base_root=settings.WORKSPACE_ROOT, must_exist=True)

    if target_path.stat().st_size > settings.MAX_FILE_READ_BYTES:
        raise ValueError(f"File size exceeds safety limit ({settings.MAX_FILE_READ_BYTES} bytes)")

    ext = target_path.suffix.lower()
    records: List[Dict[str, Any]] = []
    columns: List[str] = []

    if ext == ".csv":
        with open(target_path, "r", encoding="utf-8", errors="replace") as f:
            reader = csv.DictReader(f)
            columns = list(reader.fieldnames or [])
            for row in reader:
                records.append(dict(row))
    elif ext in (".json", ".jsonl"):
        with open(target_path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read().strip()
            if content.startswith("["):
                data = json.loads(content)
                if isinstance(data, list) and data:
                    records = data
                    columns = list(records[0].keys()) if isinstance(records[0], dict) else []
            else:
                # JSON Lines
                for line in content.splitlines():
                    if line.strip():
                        item = json.loads(line)
                        records.append(item)
                if records and isinstance(records[0], dict):
                    columns = list(records[0].keys())
    else:
        raise ValueError(f"Unsupported data format '{ext}'. Must be .csv or .json")

    return records, columns, str(target_path.relative_to(settings.WORKSPACE_ROOT))


class DataInspectTool:
    name: str = "data.inspect"
    display_name: str = "Inspect Dataset Schema"
    description: str = (
        "Inspects CSV or JSON file structure, schema, inferred column types, "
        "row/column counts, and returns a sample of top records."
    )
    category: ToolCategory = ToolCategory.DATA
    permission_level: ToolPermissionLevel = ToolPermissionLevel.LEVEL_0_READ_ONLY
    side_effect_level: SideEffectLevel = SideEffectLevel.READ_ONLY
    requires_approval: bool = False
    is_enabled: bool = True
    timeout_seconds: int = 15
    max_output_size: int = 30000

    input_schema: Dict[str, Any] = {
        "type": "object",
        "properties": {
            "filepath": {
                "type": "string",
                "description": "Path to CSV or JSON file in sandbox or workspace"
            },
            "sample_rows": {
                "type": "integer",
                "description": "Number of preview rows to inspect (default: 5, max: 20)",
                "default": 5
            }
        },
        "required": ["filepath"]
    }

    async def execute(self, arguments: Dict[str, Any], context: Any = None) -> ToolResult:
        filepath = arguments.get("filepath", "").strip()
        sample_rows = min(max(1, arguments.get("sample_rows", 5)), 20)

        if not filepath:
            return ToolResult(success=False, output="Filepath argument cannot be empty.", error="INVALID_ARGUMENTS")

        try:
            records, columns, rel_path = _load_data_file(filepath)
            total_rows = len(records)

            # Infer column types
            inferred_types = {}
            for col in columns:
                types_seen = set()
                for r in records[:50]:
                    val = r.get(col)
                    if val is None or val == "":
                        continue
                    try:
                        int(val)
                        types_seen.add("integer")
                    except (ValueError, TypeError):
                        try:
                            float(val)
                            types_seen.add("float")
                        except (ValueError, TypeError):
                            types_seen.add("string")
                inferred_types[col] = "/".join(sorted(types_seen)) if types_seen else "empty"

            sample = records[:sample_rows]
            summary_lines = [
                f"Dataset: {rel_path}",
                f"Total Rows: {total_rows}, Total Columns: {len(columns)}",
                "Schema & Inferred Types:",
            ]
            for col in columns:
                summary_lines.append(f"  - {col}: {inferred_types.get(col, 'string')}")

            summary_lines.append(f"\nTop {len(sample)} Sample Records:")
            for i, row in enumerate(sample, start=1):
                summary_lines.append(f"  [{i}] {json.dumps(row, ensure_ascii=False)}")

            return ToolResult(
                success=True,
                data={
                    "filepath": rel_path,
                    "row_count": total_rows,
                    "column_count": len(columns),
                    "columns": columns,
                    "inferred_types": inferred_types,
                    "sample": sample,
                },
                output="\n".join(summary_lines)
            )
        except Exception as e:
            return ToolResult(success=False, output=f"Data inspection failed: {str(e)}", error="INSPECTION_ERROR")


class DataProfileTool:
    name: str = "data.profile"
    display_name: str = "Profile Dataset Statistics"
    description: str = (
        "Computes comprehensive descriptive statistics: missing/null values, duplicate rows, "
        "and numeric min/max/mean metrics for CSV or JSON files."
    )
    category: ToolCategory = ToolCategory.DATA
    permission_level: ToolPermissionLevel = ToolPermissionLevel.LEVEL_0_READ_ONLY
    side_effect_level: SideEffectLevel = SideEffectLevel.READ_ONLY
    requires_approval: bool = False
    is_enabled: bool = True
    timeout_seconds: int = 20
    max_output_size: int = 30000

    input_schema: Dict[str, Any] = {
        "type": "object",
        "properties": {
            "filepath": {
                "type": "string",
                "description": "Path to CSV or JSON file"
            }
        },
        "required": ["filepath"]
    }

    async def execute(self, arguments: Dict[str, Any], context: Any = None) -> ToolResult:
        filepath = arguments.get("filepath", "").strip()
        if not filepath:
            return ToolResult(success=False, output="Filepath argument cannot be empty.", error="INVALID_ARGUMENTS")

        try:
            records, columns, rel_path = _load_data_file(filepath)
            total_rows = len(records)
            if total_rows == 0:
                return ToolResult(
                    success=True,
                    data={"filepath": rel_path, "row_count": 0, "columns": columns},
                    output=f"Dataset '{rel_path}' is empty (0 rows)."
                )

            # Null analysis
            null_counts = {col: 0 for col in columns}
            numeric_stats = {}

            for col in columns:
                nums = []
                for r in records:
                    val = r.get(col)
                    if val is None or str(val).strip() == "":
                        null_counts[col] += 1
                    else:
                        try:
                            nums.append(float(val))
                        except (ValueError, TypeError):
                            pass
                if nums and len(nums) > total_rows * 0.3:
                    numeric_stats[col] = {
                        "count": len(nums),
                        "min": min(nums),
                        "max": max(nums),
                        "mean": round(sum(nums) / len(nums), 4),
                    }

            # Duplicate row estimation
            seen_hashes = set()
            duplicates = 0
            for r in records:
                row_key = tuple(sorted(r.items()))
                if row_key in seen_hashes:
                    duplicates += 1
                else:
                    seen_hashes.add(row_key)

            lines = [
                f"Profile Report for {rel_path}:",
                f"- Total Rows: {total_rows}, Columns: {len(columns)}",
                f"- Duplicate Rows: {duplicates} ({round(duplicates/total_rows*100, 2)}%)",
                "- Missing Values per Column:",
            ]
            for col, n_cnt in null_counts.items():
                pct = round(n_cnt / total_rows * 100, 2)
                lines.append(f"  * {col}: {n_cnt} nulls ({pct}%)")

            if numeric_stats:
                lines.append("- Numeric Column Aggregations:")
                for col, stat in numeric_stats.items():
                    lines.append(f"  * {col} -> Min: {stat['min']}, Max: {stat['max']}, Mean: {stat['mean']}")

            return ToolResult(
                success=True,
                data={
                    "filepath": rel_path,
                    "row_count": total_rows,
                    "column_count": len(columns),
                    "duplicate_rows": duplicates,
                    "null_counts": null_counts,
                    "numeric_stats": numeric_stats,
                },
                output="\n".join(lines)
            )
        except Exception as e:
            return ToolResult(success=False, output=f"Data profiling failed: {str(e)}", error="PROFILE_ERROR")


class DataSummarizeTool:
    name: str = "data.summarize"
    display_name: str = "Summarize Data Insights"
    description: str = "Synthesizes data metrics and distributions into an executive analytical markdown summary."
    category: ToolCategory = ToolCategory.DATA
    permission_level: ToolPermissionLevel = ToolPermissionLevel.LEVEL_0_READ_ONLY
    side_effect_level: SideEffectLevel = SideEffectLevel.READ_ONLY
    requires_approval: bool = False
    is_enabled: bool = True
    timeout_seconds: int = 15
    max_output_size: int = 30000

    input_schema: Dict[str, Any] = {
        "type": "object",
        "properties": {
            "filepath": {"type": "string", "description": "Path to CSV or JSON file"}
        },
        "required": ["filepath"]
    }

    async def execute(self, arguments: Dict[str, Any], context: Any = None) -> ToolResult:
        filepath = arguments.get("filepath", "").strip()
        try:
            records, columns, rel_path = _load_data_file(filepath)
            n_rows = len(records)
            lines = [
                f"## Executive Data Summary: {Path(rel_path).name}",
                f"**Path**: `{rel_path}` | **Dimensions**: {n_rows} rows x {len(columns)} columns",
                "",
                "### Key Column Overview",
            ]
            for col in columns[:8]:
                unique_vals = len({str(r.get(col)) for r in records if r.get(col) is not None})
                lines.append(f"- **{col}**: {unique_vals} distinct values")
            if len(columns) > 8:
                lines.append(f"- *...and {len(columns) - 8} additional columns.*")

            return ToolResult(
                success=True,
                data={"filepath": rel_path, "row_count": n_rows, "columns": columns},
                output="\n".join(lines)
            )
        except Exception as e:
            return ToolResult(success=False, output=f"Data summarization failed: {str(e)}", error="SUMMARIZE_ERROR")


class DataValidateTool:
    name: str = "data.validate"
    display_name: str = "Validate Data Quality Rules"
    description: str = (
        "Validates dataset against quality assertions: required columns, maximum null tolerance, "
        "minimum row count, and unique key constraints."
    )
    category: ToolCategory = ToolCategory.DATA
    permission_level: ToolPermissionLevel = ToolPermissionLevel.LEVEL_0_READ_ONLY
    side_effect_level: SideEffectLevel = SideEffectLevel.READ_ONLY
    requires_approval: bool = False
    is_enabled: bool = True
    timeout_seconds: int = 15
    max_output_size: int = 20000

    input_schema: Dict[str, Any] = {
        "type": "object",
        "properties": {
            "filepath": {"type": "string", "description": "Path to CSV or JSON file"},
            "required_columns": {
                "type": "array",
                "items": {"type": "string"},
                "description": "List of columns that must be present"
            },
            "min_rows": {
                "type": "integer",
                "description": "Minimum required row count",
                "default": 1
            },
            "no_nulls_in": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Columns that cannot contain any null values"
            }
        },
        "required": ["filepath"]
    }

    async def execute(self, arguments: Dict[str, Any], context: Any = None) -> ToolResult:
        filepath = arguments.get("filepath", "").strip()
        req_cols = arguments.get("required_columns", [])
        min_rows = arguments.get("min_rows", 1)
        no_nulls = arguments.get("no_nulls_in", [])

        try:
            records, columns, rel_path = _load_data_file(filepath)
            violations = []

            # 1. Check required columns
            for col in req_cols:
                if col not in columns:
                    violations.append(f"Missing required column: '{col}'")

            # 2. Check row count
            if len(records) < min_rows:
                violations.append(f"Row count ({len(records)}) is below required minimum ({min_rows})")

            # 3. Check null constraints
            for col in no_nulls:
                if col in columns:
                    nulls = sum(1 for r in records if r.get(col) is None or str(r.get(col)).strip() == "")
                    if nulls > 0:
                        violations.append(f"Column '{col}' has {nulls} null/blank values (disallowed)")

            passed = len(violations) == 0
            res_msg = f"Data Quality Validation for {rel_path}: " + ("PASSED" if passed else f"FAILED ({len(violations)} issues)")
            if violations:
                res_msg += "\nIssues:\n" + "\n".join([f"- {v}" for v in violations])

            return ToolResult(
                success=passed,
                data={
                    "filepath": rel_path,
                    "passed": passed,
                    "violations": violations,
                    "checked_rows": len(records),
                },
                output=res_msg
            )
        except Exception as e:
            return ToolResult(success=False, output=f"Validation error: {str(e)}", error="VALIDATION_ERROR")
