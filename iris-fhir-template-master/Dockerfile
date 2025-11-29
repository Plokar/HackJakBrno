ARG IMAGE=intersystemsdc/irishealth-community:latest
FROM $IMAGE

WORKDIR /home/irisowner/irisdev

# Copy source files
COPY --chown=${ISC_PACKAGE_MGRUSER}:${ISC_PACKAGE_IRISGROUP} . .

# Start IRIS, merge config, run setup script
RUN iris start IRIS && \
    iris merge IRIS merge.cpf && \
    iris session IRIS < iris.script && \
    iris stop IRIS quietly

# Update swagger UI config
RUN old=http://localhost:52773/crud/_spec && \
    new=/fhirUI/irisfhir_swagger.json && \
    sed -i "s|$old|$new|g" /usr/irissys/csp/swagger-ui/index.html