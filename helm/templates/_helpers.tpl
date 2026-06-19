{{- define "caresync.name" -}}
{{- .Chart.Name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "caresync.fullname" -}}
{{- printf "%s-%s" .Release.Name .Chart.Name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "caresync.labels" -}}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{- define "caresync.selectorLabels" -}}
app.kubernetes.io/name: {{ .Values.environment }}-{{ include "caresync.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
