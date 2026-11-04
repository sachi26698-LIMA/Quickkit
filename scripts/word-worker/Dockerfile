# OPERATOR RECIPE: not built/validated in the Arena sandbox. Supply a real pinned base.
ARG BASE
FROM ${BASE}
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice-writer python3 coreutils fontconfig fonts-liberation fonts-dejavu-core fonts-noto-core \
    && rm -rf /var/lib/apt/lists/* \
    && dpkg-query -W > /usr/share/quickkit-native-packages.txt
COPY fonts/ /usr/local/share/fonts/quickkit/
RUN fc-cache -f && mkdir -p /work /var/empty && chmod 0555 /work
COPY --chmod=0555 entry.py /opt/quickkit-entry.py
ENV HOME=/work/home TMPDIR=/tmp LANG=C.UTF-8 LC_ALL=C.UTF-8 SAL_USE_VCLPLUGIN=svp
USER 65532:65532
WORKDIR /work
ENTRYPOINT ["/usr/bin/python3", "/opt/quickkit-entry.py"]
