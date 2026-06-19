const fs = require('fs');
const path = require('path');

const base = 'helm';

const services = [
  'auth-service',
  'user-service',
  'appointment-service',
  'document-service',
  'notification-service',
  'ai-service',
  'frontend'
];

const files = {
  'Chart.yaml': "apiVersion: v2\nname: caresync\ndescription: A Helm chart for Kubernetes deployment of CareSync\ntype: application\nversion: 1.0.0\nappVersion: \"1.0.0\"\n",
  'values.yaml': "\nnamespace: caresync-dev\nenvironment: dev\nregion: us-east-1\n\ngateway:\n  className: eg\n\nsecrets:\n  name: caresync-app-secrets\n  awsSecretName: caresync/app-secrets-dev\n\nservices:\n  authService:\n    repository: caresync/auth-service\n    tag: latest\n    port: 3001\n  userService:\n    repository: caresync/user-service\n    tag: latest\n    port: 3002\n  appointmentService:\n    repository: caresync/appointment-service\n    tag: latest\n    port: 3003\n  documentService:\n    repository: caresync/document-service\n    tag: latest\n    port: 3004\n  notificationService:\n    repository: caresync/notification-service\n    tag: latest\n    port: 3005\n  aiService:\n    repository: caresync/ai-service\n    tag: latest\n    port: 3006\n  frontend:\n    repository: caresync/frontend\n    tag: latest\n    port: 80\n",
  'values-dev.yaml': "\n# Dev-specific overrides\n# These would typically be populated by a CI/CD pipeline\n",
  'templates/_helpers.tpl': "{{- define \"caresync.name\" -}}\n{{- .Chart.Name | trunc 63 | trimSuffix \"-\" }}\n{{- end }}\n\n{{- define \"caresync.fullname\" -}}\n{{- printf \"%s-%s\" .Release.Name .Chart.Name | trunc 63 | trimSuffix \"-\" }}\n{{- end }}\n\n{{- define \"caresync.labels\" -}}\nhelm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}\napp.kubernetes.io/managed-by: {{ .Release.Service }}\napp.kubernetes.io/instance: {{ .Release.Name }}\n{{- end }}\n\n{{- define \"caresync.selectorLabels\" -}}\napp.kubernetes.io/name: {{ .Values.environment }}-{{ include \"caresync.name\" . }}\napp.kubernetes.io/instance: {{ .Release.Name }}\n{{- end }}\n",
  'templates/namespace/namespace.yaml': "apiVersion: v1\nkind: Namespace\nmetadata:\n  name: {{ .Values.namespace }}\n",
  'templates/networkpolicies/default-deny.yaml': "apiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata:\n  name: default-deny-all\n  namespace: {{ .Values.namespace }}\nspec:\n  podSelector: {}\n  policyTypes:\n  - Ingress\n  - Egress\n",
  'templates/networkpolicies/allow-dns.yaml': "apiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata:\n  name: allow-dns\n  namespace: {{ .Values.namespace }}\nspec:\n  podSelector: {}\n  policyTypes:\n  - Egress\n  egress:\n  - to:\n    - namespaceSelector:\n        matchLabels:\n          kubernetes.io/metadata.name: kube-system\n    ports:\n    - protocol: UDP\n      port: 53\n    - protocol: TCP\n      port: 53\n",
  'templates/networkpolicies/allow-egress.yaml': "apiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata:\n  name: allow-egress-aws\n  namespace: {{ .Values.namespace }}\nspec:\n  podSelector: {}\n  policyTypes:\n  - Egress\n  egress:\n  - to:\n    - ipBlock:\n        cidr: 0.0.0.0/0\n",
  'templates/gateway/gatewayclass.yaml': "apiVersion: gateway.networking.k8s.io/v1\nkind: GatewayClass\nmetadata:\n  name: {{ .Values.gateway.className }}\nspec:\n  controllerName: gateway.envoyproxy.io/gatewayclass-controller\n",
  'templates/gateway/gateway.yaml': "apiVersion: gateway.networking.k8s.io/v1\nkind: Gateway\nmetadata:\n  name: caresync-gateway\n  namespace: {{ .Values.namespace }}\nspec:\n  gatewayClassName: {{ .Values.gateway.className }}\n  listeners:\n  - name: http\n    protocol: HTTP\n    port: 80\n    allowedRoutes:\n      namespaces:\n        from: Same\n",
  'templates/gateway/ingress-alb.yaml': "apiVersion: networking.k8s.io/v1\nkind: Ingress\nmetadata:\n  name: envoy-alb-ingress\n  namespace: {{ .Values.namespace }}\n  annotations:\n    alb.ingress.kubernetes.io/scheme: internet-facing\n    alb.ingress.kubernetes.io/target-type: ip\nspec:\n  ingressClassName: alb\n  rules:\n    - http:\n        paths:\n          - path: /\n            pathType: Prefix\n            backend:\n              service:\n                name: envoy-caresync-gateway\n                port:\n                  number: 80\n",
  'templates/external-secrets/clustersecretstore.yaml': "apiVersion: external-secrets.io/v1beta1\nkind: ClusterSecretStore\nmetadata:\n  name: aws-secretsmanager\nspec:\n  provider:\n    aws:\n      service: SecretsManager\n      region: {{ .Values.region }}\n      auth:\n        jwt:\n          serviceAccountRef:\n            name: external-secrets-sa\n            namespace: {{ .Values.namespace }}\n",
  'templates/external-secrets/externalsecret.yaml': "apiVersion: external-secrets.io/v1beta1\nkind: ExternalSecret\nmetadata:\n  name: {{ .Values.secrets.name }}\n  namespace: {{ .Values.namespace }}\nspec:\n  refreshInterval: \"1h\"\n  secretStoreRef:\n    name: aws-secretsmanager\n    kind: ClusterSecretStore\n  target:\n    name: {{ .Values.secrets.name }}\n    creationPolicy: Owner\n  dataFrom:\n  - extract:\n      key: {{ .Values.secrets.awsSecretName }}\n",
};

services.forEach(service => {
  const isFrontend = service === 'frontend';
  const camelName = service.replace(/-([a-z])/g, g => g[1].toUpperCase());
  const pathPrefix = isFrontend ? '/' : '/api/' + service.split('-')[0];

  files['templates/serviceaccounts/' + service + '-sa.yaml'] = "apiVersion: v1\nkind: ServiceAccount\nmetadata:\n  name: " + service + "-sa\n  namespace: {{ .Values.namespace }}\n  labels:\n    app: " + service + "\n    {{- include \"caresync.labels\" . | nindent 4 }}\n  annotations:\n    eks.amazonaws.com/role-arn: \"arn:aws:iam::${AWS_ACCOUNT_ID}:role/caresync-dev-" + service + "-role\"\nautomountServiceAccountToken: true\n";

  let deployment = "apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: " + service + "\n  namespace: {{ .Values.namespace }}\n  labels:\n    app: " + service + "\n    {{- include \"caresync.labels\" . | nindent 4 }}\nspec:\n  replicas: 2\n  selector:\n    matchLabels:\n      app: " + service + "\n  template:\n    metadata:\n      labels:\n        app: " + service + "\n        {{- include \"caresync.selectorLabels\" . | nindent 8 }}\n    spec:\n      serviceAccountName: " + service + "-sa\n      securityContext:\n        fsGroup: 1000\n";
  
  if (!isFrontend) {
    deployment += "      initContainers:\n        - name: wait-for-db\n          image: busybox:1.36\n          command:\n            - sh\n            - -c\n            - |\n              DB_HOST=$(echo $DATABASE_URL | sed -e 's|^.*@||' -e 's|:.*$||' -e 's|/.*$||')\n              echo \"[init] Waiting for database at $DB_HOST:5432...\"\n              until nc -z \"$DB_HOST\" 5432; do\n                echo \"[init] DB not ready — retrying in 3s\"\n                sleep 3\n              done\n              echo \"[init] Database is reachable\"\n          envFrom:\n            - secretRef:\n                name: {{ .Values.secrets.name }}\n          securityContext:\n            allowPrivilegeEscalation: false\n            runAsNonRoot: true\n            runAsUser: 1000\n";
  }

  deployment += "      topologySpreadConstraints:\n      - maxSkew: 1\n        topologyKey: topology.kubernetes.io/zone\n        whenUnsatisfiable: DoNotSchedule\n        labelSelector:\n          matchLabels:\n            app: " + service + "\n      containers:\n      - name: " + service + "\n        image: \"{{ .Values.services." + camelName + ".repository }}:{{ .Values.services." + camelName + ".tag }}\"\n        imagePullPolicy: Always\n        ports:\n        - containerPort: {{ .Values.services." + camelName + ".port }}\n        envFrom:\n        - secretRef:\n            name: {{ .Values.secrets.name }}\n        securityContext:\n          allowPrivilegeEscalation: false\n          runAsNonRoot: true\n          runAsUser: 1000\n        resources:\n          requests:\n            cpu: \"100m\"\n            memory: \"128Mi\"\n          limits:\n            cpu: \"500m\"\n            memory: \"512Mi\"\n        livenessProbe:\n          httpGet:\n            path: " + (isFrontend ? '/' : '/api/health') + "\n            port: {{ .Values.services." + camelName + ".port }}\n          initialDelaySeconds: 15\n          periodSeconds: 20\n        readinessProbe:\n          httpGet:\n            path: " + (isFrontend ? '/' : '/api/health') + "\n            port: {{ .Values.services." + camelName + ".port }}\n          initialDelaySeconds: 5\n          periodSeconds: 10\n";

  files['templates/' + service + '/deployment.yaml'] = deployment;

  if (isFrontend) {
    files['templates/' + service + '/deployment.yaml'] = files['templates/' + service + '/deployment.yaml'].replace(
      'envFrom:',
      "volumeMounts:\n        - name: env-config\n          mountPath: /usr/share/nginx/html/env-config.js\n          subPath: env-config.js\n        envFrom:"
    ).replace(
      'containers:',
      "volumes:\n      - name: env-config\n        configMap:\n          name: frontend-config\n      containers:"
    );

    files['templates/' + service + '/configmap.yaml'] = "apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: frontend-config\n  namespace: {{ .Values.namespace }}\ndata:\n  env-config.js: |\n    window._env_ = {\n      API_BASE_URL: \"http://caresync-alb.us-east-1.elb.amazonaws.com\"\n    };\n";
  }

  if (service === 'document-service') {
    files['templates/' + service + '/deployment.yaml'] = files['templates/' + service + '/deployment.yaml'].replace(
      'envFrom:',
      "volumeMounts:\n        - name: uploads-scratch\n          mountPath: /uploads\n        envFrom:"
    ).replace(
      'containers:',
      "volumes:\n      - name: uploads-scratch\n        emptyDir: {}\n      containers:"
    );
  }

  files['templates/' + service + '/service.yaml'] = "apiVersion: v1\nkind: Service\nmetadata:\n  name: " + service + "\n  namespace: {{ .Values.namespace }}\n  labels:\n    app: " + service + "\nspec:\n  selector:\n    app: " + service + "\n  ports:\n  - port: 80\n    targetPort: {{ .Values.services." + camelName + ".port }}\n  type: ClusterIP\n";

  files['templates/' + service + '/httproute.yaml'] = "apiVersion: gateway.networking.k8s.io/v1\nkind: HTTPRoute\nmetadata:\n  name: " + service + "-route\n  namespace: {{ .Values.namespace }}\nspec:\n  parentRefs:\n  - name: caresync-gateway\n  rules:\n  - matches:\n    - path:\n        type: PathPrefix\n        value: " + pathPrefix + "\n    backendRefs:\n    - name: " + service + "\n      port: 80\n";

  files['templates/' + service + '/hpa.yaml'] = "apiVersion: autoscaling/v2\nkind: HorizontalPodAutoscaler\nmetadata:\n  name: " + service + "-hpa\n  namespace: {{ .Values.namespace }}\nspec:\n  scaleTargetRef:\n    apiVersion: apps/v1\n    kind: Deployment\n    name: " + service + "\n  minReplicas: 2\n  maxReplicas: 10\n  metrics:\n  - type: Resource\n    resource:\n      name: cpu\n      target:\n        type: Utilization\n        averageUtilization: 70\n";
});

for (const [filepath, content] of Object.entries(files)) {
  const fullPath = path.join(base, filepath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
}
console.log('Helm chart generated successfully with new practices.');

