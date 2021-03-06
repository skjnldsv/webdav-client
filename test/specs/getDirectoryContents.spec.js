const fs = require("fs");
const path = require("path");

function useSeafileResponse() {
    returnFakeResponse(fs.readFileSync(path.resolve(__dirname, "../responses/seafile-propfind.xml"), "utf8"));
}

describe("getDirectoryContents", function() {
    beforeEach(function() {
        this.client = createWebDAVClient("http://localhost:9988/webdav/server", {
            username: createWebDAVServer.test.username,
            password: createWebDAVServer.test.password
        });
        clean();
        this.server = createWebDAVServer();
        return this.server.start();
    });

    afterEach(function() {
        return this.server.stop();
    });

    it("returns an array of items", function() {
        return this.client.getDirectoryContents("/").then(function(contents) {
            expect(contents).to.be.an("array");
            expect(contents[0]).to.be.an("object");
        });
    });

    it("returns correct directory results", function() {
        return this.client.getDirectoryContents("/").then(function(contents) {
            const sub1 = contents.find(function(item) {
                return item.basename === "sub1";
            });
            expect(sub1.filename).to.equal("/sub1");
            expect(sub1.size).to.equal(0);
            expect(sub1.type).to.equal("directory");
        });
    });

    it("returns results not including base directory", function() {
        return this.client.getDirectoryContents("/sub1").then(function(contents) {
            const sub1 = contents.find(function(item) {
                return item.basename === "sub1";
            });
            expect(sub1).to.be.undefined;
        });
    });

    it("returns only expected results when using trailing slash", function() {
        return this.client.getDirectoryContents("/webdav/").then(function(contents) {
            const items = contents.map(item => item.filename);
            expect(items).to.deep.equal(["/webdav/server"]);
        });
    });

    it("returns correct file results", function() {
        return this.client.getDirectoryContents("/").then(function(contents) {
            const sub1 = contents.find(item => item.basename === "alrighty.jpg");
            const sub2 = contents.find(item => item.basename === "file&name.txt");
            expect(sub1.filename).to.equal("/alrighty.jpg");
            expect(sub1.size).to.equal(52130);
            expect(sub1.type).to.equal("file");
            expect(sub2.filename).to.equal("/file&name.txt");
        });
    });

    it("returns correct file results in sub-directory", function() {
        return this.client.getDirectoryContents("/sub1").then(function(contents) {
            const sub1 = contents.find(function(item) {
                return item.basename === "irrelephant.jpg";
            });
            expect(sub1.filename).to.equal("/sub1/irrelephant.jpg");
            expect(sub1.size).to.equal(138008);
            expect(sub1.type).to.equal("file");
        });
    });

    it("returns correct file results for files with special characters", function() {
        return this.client.getDirectoryContents("/sub1").then(function(contents) {
            const sub1 = contents.find(function(item) {
                return item.basename === "ยากจน #1.txt";
            });
            expect(sub1.filename).to.equal("/sub1/ยากจน #1.txt");
        });
    });

    it("returns the contents of a directory with repetitive naming", function() {
        return this.client.getDirectoryContents("/webdav/server").then(function(contents) {
            expect(contents).to.be.an("array");
            expect(contents[0]).to.be.an("object");
            expect(contents[0]).to.have.property("basename", "notreal.txt");
        });
    });

    it("returns only the directory contents (issue #68)", function() {
        return this.client.getDirectoryContents("/two words").then(function(contents) {
            expect(contents).to.have.lengthOf(1);
            expect(contents[0].basename).to.equal("file.txt");
        });
    });

    it("returns only the directory contents for directory with & in name", function() {
        return this.client.getDirectoryContents("/with & in path").then(function(contents) {
            expect(contents).to.have.lengthOf(1);
            expect(contents[0].basename).to.equal("file.txt");
        });
    });

    it("returns correct directory contents when path contains encoded sequences (issue #93)", function() {
        return this.client.getDirectoryContents("/two%20words").then(contents => {
            expect(contents).to.have.lengthOf(1);
            expect(contents[0].basename).to.equal("file2.txt");
        });
    });

    describe("when using details: true", function() {
        it("returns data and headers properties", function() {
            return this.client.getDirectoryContents("/", { details: true }).then(function(details) {
                expect(details)
                    .to.have.property("data")
                    .that.is.an("array");
                expect(details)
                    .to.have.property("headers")
                    .that.is.an("object");
            });
        });

        it("returns props on each directory item", function() {
            return this.client.getDirectoryContents("/", { details: true }).then(function(details) {
                const alrightyJpg = details.data.find(item => item.basename === "alrighty.jpg");
                expect(alrightyJpg)
                    .to.have.property("props")
                    .that.is.an("object");
                expect(alrightyJpg.props)
                    .to.have.property("getlastmodified")
                    .that.matches(/GMT$/);
            });
        });
    });

    describe("when connected to Seafile server", function() {
        beforeEach(function() {
            this.client = createWebDAVClient("https://cloud.ascal-strasbg.fr/seafdav", {
                username: createWebDAVServer.test.username,
                password: createWebDAVServer.test.password
            });
            useSeafileResponse();
        });

        afterEach(function() {
            restoreFetch();
        });

        it("returns the correct response", function() {
            return this.client.getDirectoryContents("/").then(function(contents) {
                expect(contents).to.be.an("array");
                expect(contents).to.deep.equal([
                    {
                        filename: "/Ma bibliothèque",
                        etag: "2920f985ebc6692632c7c3ab46b3919556239d37",
                        basename: "Ma bibliothèque",
                        lastmod: null,
                        size: 0,
                        type: "directory"
                    }
                ]);
            });
        });
    });

    it("supports globbing files", function() {
        const options = {
            deep: true,
            glob: "/webdav/**/*.txt"
        };
        return this.client.getDirectoryContents("/", options).then(function(contents) {
            expect(contents).to.have.lengthOf(1);
            expect(contents[0].filename).to.equal("/webdav/server/notreal.txt");
        });
    });
});
